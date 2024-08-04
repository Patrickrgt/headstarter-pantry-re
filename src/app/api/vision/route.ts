// pages/api/visions/route.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { fileTypeFromBuffer } from "file-type";
import * as dotenv from "dotenv";
import { db } from "../../../../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
dotenv.config();

const openai = new OpenAI();

interface VisionApiResponse {
  success: boolean;
  data: any; // Replace `any` with a more specific type based on your data structure.
}

function isValidBase64(base64String: string) {
  const regex =
    /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
  return regex.test(base64String);
}

async function callGptVisionApi(imageBase64: string, email: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "What’s in this image? Can your response just be an assumption of what is in the picture as well as the quantity shown in the picture? For example if the picture is an orange and there are 2, your response should be orange 2. please make the response only 2 words, for example if it is an airpods case just say airpods and the second word is the quantity count which should be a number.",
          },
          {
            type: "image_url",
            image_url: {
              url: `${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  });

  if (!response || !response.choices || response.choices.length === 0) {
    throw new Error("Failed to call GPT Vision API or no data received");
  }

  const resultText = response.choices[0]?.message?.content;
  if (resultText) {
    const [item, count] = resultText.split(" ");

    // Assuming your database structure is `/pantry/${item}` and you store count

    try {
      // Assuming 'email' holds the user's email and is available in this scope
      const itemsRef = collection(db, `pantries/${email}/items`);
      const docRef = doc(itemsRef, item); // Create a reference to the document for the specific item under the user's items collection

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const newCount = docSnap.data().count + parseInt(count);
        console.log(newCount); // You can see the new count in the console
        await setDoc(docRef, { count: newCount }); // Update the document with the new count
      } else {
        await setDoc(docRef, { count: parseInt(count, 10) }); // If the item doesn't exist, create it with a count of 'count'
      }
      // Optionally refresh the pantry after updating
      // fetchPantry(email); // Uncomment if you have this function set up to refresh the items list
    } catch (error) {
      console.error("Failed to add item:", error); // Log if there is an error
    }

    //   const itemRef = doc(db, "pantry", item);
    //   try {
    //     await updateDoc(itemRef, { count: parseInt(count, 10) });
    //   } catch (error) {
    //     console.error("Failed to update Firestore:", error);
    //     throw error; // Rethrow or handle error appropriately
    //   }
    // } else {
    //   // Handle the case where resultText is undefined or null
    //   console.error("No result text available or invalid format");
    //   throw new Error(
    //     "No result text available or the format is incorrect from the API response"
    //   );
  }

  return resultText;
}

// Export POST method as a named export
export async function POST(req: any) {
  try {
    const { image, email } = await req.json();

    if (!email) {
      return NextResponse.json({
        error: "No image provided",
      });
    }

    let strings = image.split(",");
    let extension = "";
    switch (
      strings[0] //check image's extension
    ) {
      case "data:image/jpeg;base64":
        extension = "jpeg";
        break;
      case "data:image/png;base64":
        extension = "png";
        break;
      default: //should write cases for more images types
        extension = "jpg";
        break;
    }

    // if (!extension) {
    //   console.log('Unsupported file format');
    // } else {
    //   console.log("Detected file type:", extension);
    // }

    // Regular expression to check if the string is valid Base64
    // const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
    // if (!base64Regex.test(image)) {
    //   console.error('not base64');
    //   return NextResponse.json({
    //     error: "Invalid Base64 string",
    //   });
    // }

    console.log(
      "Received image size: ",
      Buffer.from(image, "base64").length / 1024 + " KB"
    );
    const visionResponse = await callGptVisionApi(image, email);
    return NextResponse.json({
      visionResponse,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      error: "Internal server error",
    });
  }
}
