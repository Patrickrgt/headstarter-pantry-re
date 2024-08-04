"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import imageCompression from 'browser-image-compression';
import {
  Box,
  Stack,
  Typography,
  Button,
  Modal,
  TextField,
} from "@mui/material";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where
} from "firebase/firestore";
import { signIn, signOut, useSession } from "next-auth/react";

interface PantryItem {
  name: string;
  count: number;
  email?: string; // Optional, include if you need it in your app logic
}

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

export default function Home() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [filteredPantry, setFilteredPantry] = useState<PantryItem[]>([]);
  const [pantryItem, setPantryItem] = useState("");
  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email) {
      fetchPantry(session.user.email);
      setUser(session.user.email);
    }
  }, [session]);

  useEffect(() => {
    handleSearch(search);
  }, [pantry, search]);

  const handleUpload = () => {
    setLoading(true);

    if (!photo) return;
    handleSendImage(photo, user); // You can also set it into the state here
    console.log("Photo uploaded", user);
  };

  const handleModal = () => {
    setOpen(!open);
  };

  const handleSendImage = async (base64Image: any, user: any) => {
    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image, email: user }),
      });
      const data = await response.json();
      console.log("Response from server:", data);
    } catch (error) {
      console.error("Error sending image:", error);
    }
    fetchPantry(user);
    setPhoto(null);
    setLoading(false);
  };

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      }
      try {
        const compressedFile = await imageCompression(file, options);
        console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
        console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
        const reader = new FileReader();
        reader.onloadend = () => {
          // Now reader.result contains the data URL as a base64-encoded string
          // console.log(reader.result);  // You can log it here
          setPhoto(reader.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.log(error);
      }
   
    }
  };



  const fetchPantry = async (email: string) => {
    try {
        const itemsRef = collection(db, `pantries/${email}/items`);
        const snapshot = await getDocs(itemsRef);
        const pantryList: PantryItem[] = [];
        snapshot.forEach((doc) => {
            const item = doc.data() as PantryItem;
            pantryList.push({ ...item, name: doc.id });
        });
        setPantry(pantryList);
    } catch (error) {
        console.error("Failed to fetch pantry items:", error);
    }
};


  const handleSearch = (query: string) => {
    if (query) {
      const filtered = pantry.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPantry(filtered);
    } else {
      setFilteredPantry(pantry); // If search query is empty, show all items
    }
  };

  const addItem = async (item: string) => {
    try {
      const docRef = doc(collection(db, `pantries/${user}/items`), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const count = docSnap.data().count + 1;
        await setDoc(docRef, { count });
      } else {
        await setDoc(docRef, { count: 1 });
      }
      fetchPantry(user); // Make sure to pass the user's email to the fetch function
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };
  
  const removeItem = async (name: string) => {
    try {
      const docRef = doc(collection(db, `pantries/${user}/items`), name);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { count } = docSnap.data();
        if (count === 1) {
          await deleteDoc(docRef); // Delete the document if count is 1
        } else {
          await setDoc(docRef, { count: count - 1 }); // Decrement the count if it's greater than 1
        }
        fetchPantry(user); // Refresh the pantry list after the operation
      }
    } catch (error) {
      console.error("Failed to remove item:", error); // Log error if there's a problem
    }
  };
  

  const handleCloseModal = () => {
    setPhoto(null);
  };

  return (
    <div className="h-[100dvh] flex flex-col justify-start items-center gap-[2vh]">
      <input
        type="text"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="p-[2vh] rounded-full text-[2vh] bg-[#D9D9D9]"
      />

      <div
        className={`${
          loading ? "block z-10" : "hidden"
        } h-[100dvh] w-full absolute  bg-black opacity-50`}
      >
        <Image
          alt="loading"
          width={0}
          height={0}
          className="h-[6vh] w-[6vh] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          src={"/images/ZKZg.gif"}
        ></Image>
      </div>
      {photo && (
        <>
          <div
            className="h-[100dvh] bg-[#D9D9D9] w-full absolute opacity-50"
            onClick={() => handleCloseModal()}
          ></div>

          <div className="flex flex-col m-auto justify-center items-center absolute bg-[#659157] p-[3vh] rounded-[1vh] gap-[2vh]">
            <img src={photo} alt="Captured" width="300" height="300" />
            <button
              className="text-black hover:to-blue-500 bg-white text-[3vh] p-[2vh] rounded-full w-full"
              onClick={() => handleUpload()}
            >
              Upload Photo
            </button>
          </div>
        </>
      )}
      <div className="flex flex-col absolute right-0 bottom-0 ">
        <div className="flex justify-center items-center">
          <label className="" htmlFor="file-upload">
            <div className="bg-[#D9D9D9] rounded-full  p-[2vh]">
              <Image
                alt="camera"
                width={0}
                height={0}
                className="w-[6vh] h-[6vh]"
                src={"/images/photo-camera-svgrepo-com.svg"}
              ></Image>
            </div>
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            placeholder=""
            className="custom-file-upload "
          />
        </div>
        <div className="flex justify-center items-center">
          <button className="p-[2vh]">
            <div className="bg-[#D9D9D9] rounded-full p-[2vh]">
              <Image
                alt="add item"
                width={0}
                height={0}
                className="w-[6vh] h-[6vh] p-[0.75vh]"
                src={"/images/plus-svgrepo-com.svg"}
                onClick={handleModal}
              />
            </div>
          </button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={handleModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style} color={"#000"}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Add Item
          </Typography>

          <Stack width={"100%"} direction={"row"} spacing={2}>
            <TextField
              id="outlined-basic"
              label="Item"
              variant="outlined"
              value={pantryItem}
              onChange={(e) => setPantryItem(e.target.value)}
            ></TextField>
            <Button
              variant="contained"
              onClick={() => {
                addItem(pantryItem);
                handleModal();
              }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>

      <div className="flex justify-between w-[80%] text-[2vh]">
        <h1>Pantry Item</h1>
        <h1>Quantity</h1>
      </div>
      <div className="w-[80%] flex flex-col gap-[2vh]">
        {filteredPantry.map(({ name, count }, id) => (
          <div key={id} className="flex justify-center items-center gap-[1vh]">
            <div
              className="bg-[#659157] flex justify-between w-full rounded-full p-[1vh] text-white text-[2vh] capitalize"
              key={name}
            >
              <div>{name}</div>
              <div className="px-[1vh] bg-white rounded-full text-[#565656]">
                {count}
              </div>
            </div>

            <button onClick={() => removeItem(name)}>
              <Image
                alt="delete"
                src={"/images/delete-left-svgrepo-com.svg"}
                width={0}
                height={0}
                className="w-[5vh] h-[5vh]"
              ></Image>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
