  // File path: ./src/NotificationsPage.js

  import React, { useState, useEffect, useCallback } from 'react';
  import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

  const NotificationsPage = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const db = getFirestore();

    const fetchPendingUsers = useCallback(async () => {
      try {
        const usersCollection = collection(db, "users");
        const userSnapshot = await getDocs(usersCollection);
        const pendingUsersList = userSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((user) => user.status === "Pending");

        setPendingUsers(pendingUsersList);
        
        // Store the pending users count in localStorage
        localStorage.setItem('pendingUsersCount', pendingUsersList.length);
      } catch (error) {
        console.error("Error fetching pending users:", error);
      }
    }, [db]);

    const handleApproveUser = async (userId) => {
      try {
        await updateDoc(doc(db, "users", userId), { status: "Approved" });
        setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
        alert("User approved successfully!");
        fetchPendingUsers(); // Update the list again after approval
      } catch (error) {
        console.error("Error approving user:", error);
      }
    };

    const handleRejectUser = async (userId) => {
      try {
        await updateDoc(doc(db, "users", userId), { status: "Rejected" });
        setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
        alert("User rejected.");
        fetchPendingUsers(); // Update the list again after rejection
      } catch (error) {
        console.error("Error rejecting user:", error);
      }
    };

    useEffect(() => {
      fetchPendingUsers();
    }, [fetchPendingUsers]);

    return (
      <div>
        <h2>Pending User Registrations</h2>
        {pendingUsers.length === 0 ? (
          <p>No pending users to approve.</p>
        ) : (
          <ul>
            {pendingUsers.map((user) => (
              <li key={user.id}>
                {user.firstName} {user.lastName} - {user.role} ({user.email})
                <button onClick={() => handleApproveUser(user.id)}>Approve</button>
                <button onClick={() => handleRejectUser(user.id)}>Reject</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  export default NotificationsPage;
