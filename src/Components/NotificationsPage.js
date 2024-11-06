  import React, { useState, useEffect, useCallback } from 'react';
  import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
  import './Notificationpage.css';

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
      <div className='notification-container'>
      <h2>Pending User Registrations</h2>
      {pendingUsers.length === 0 ? (
        <p>No pending users to approve.</p>
      ) : (
        <div className="notif-card-container">
          {pendingUsers.map((user) => (
            <div key={user.id} className="notif-card">
              <div className="notif-info">
                <h3>Username: {user.firstName} {user.lastName}</h3>
                <p>Role: {user.role}</p>
                <p>Email: {user.email}</p>
                <p>Password: {user.password}</p>
              </div>
              <div className="notif-actions">
                <button onClick={() => handleApproveUser(user.id)} className="approve-button">Approve</button>
                <button onClick={() => handleRejectUser(user.id)} className="reject-button">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

  export default NotificationsPage;
