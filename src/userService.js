import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";


// Function to add a new user
export const addUser = async (user) => {
  try {
    const docRef = await addDoc(collection(db, "users"), user);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

// Function to fetch all users
export const fetchUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} => ${doc.data()}`);
    });
  } catch (e) {
    console.error("Error fetching documents: ", e);
  }
};

export const updateUserProfile = async (userId, updatedData) => {
    try {
      const userDoc = doc(db, "users", userId);
      await updateDoc(userDoc, updatedData);
      console.log("User profile updated");
    } catch (error) {
      console.error("Error updating user profile: ", error);
      throw error;
    }
  };
