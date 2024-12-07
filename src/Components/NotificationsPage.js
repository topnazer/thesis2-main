import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import './Notificationpage.css';

const NotificationsPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
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

  const fetchResetRequests = useCallback(async () => {
    try {
      const resetCollection = collection(db, "passwordResets");
      const resetSnapshot = await getDocs(resetCollection);
      const requests = resetSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Debugging line: Check what data is being fetched
      console.log("Fetched password reset requests:", requests);

      setResetRequests(requests);
    } catch (error) {
      console.error("Error fetching reset requests:", error);
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
      await deleteDoc(doc(db, "users", userId));
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
      alert("User rejected and data deleted successfully.");
      fetchPendingUsers();
    } catch (error) {
      console.error("Error rejecting and deleting user:", error);
    }
  };

  const generateTemporaryPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleApproveReset = async (request) => {
    try {
      if (!request.userId) {
        throw new Error("User ID is missing in the request.");
      }

      const newPassword = generateTemporaryPassword();
      if (!newPassword) {
        throw new Error("Failed to generate a temporary password.");
      }

      const userDocRef = doc(db, "users", request.userId);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        throw new Error("User document not found.");
      }

      await updateDoc(userDocRef, { password: newPassword });

      const resetDocRef = doc(db, "passwordResets", request.id);
      await updateDoc(resetDocRef, { status: "Approved" });

      setResetRequests((prev) => prev.filter((req) => req.id !== request.id));

      alert("Password reset approved! The user has been notified with the new password.");
    } catch (error) {
      console.error("Error approving reset:", error);
      alert("Failed to approve the password reset request: " + error.message);
    }
  };

  const handleRejectReset = async (requestId) => {
    try {
      const resetDocRef = doc(db, "passwordResets", requestId);
      await updateDoc(resetDocRef, { status: "Rejected" });

      setResetRequests((prev) => prev.filter((req) => req.id !== requestId));

      alert("Password reset rejected.");
    } catch (error) {
      console.error("Error rejecting reset:", error);
    }
  };

  useEffect(() => {
    fetchPendingUsers(); // Fetch pending users on component mount
    fetchResetRequests(); // Fetch reset requests on component mount
  }, [fetchPendingUsers, fetchResetRequests]);

  return (
    <div className='notification-container'>
      <div className='notification-left'>
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

      <div className='notification-right'>
        <h2>Password Reset Requests</h2>
        {resetRequests.length === 0 ? (
          <p>No reset requests pending.</p>
        ) : (
          <div className="reset-requests-container">
            {resetRequests.map((req) => (
              <div key={req.id} className="reset-request-card">
                <div className="reset-info">
                  <p>Email: {req.email}</p>
                  <p>Status: {req.status}</p>
                </div>
                <div className="reset-actions">
                  <button onClick={() => handleApproveReset(req)} className="approve-button">Approve</button>
                  <button onClick={() => handleRejectReset(req.id)} className="reject-button">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
