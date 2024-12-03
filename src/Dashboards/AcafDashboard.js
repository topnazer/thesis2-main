import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth"; // Ensure proper import
import { auth } from "../firebase"; // Import your Firebase auth and db
import './acafdashboard.css'; // Add the new CSS file

const AcafDashboard = () => {
  const [deanList, setDeanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Add authentication state tracking
  const navigate = useNavigate();
  const db = getFirestore();

  // Log to debug the auth and role check process
  useEffect(() => {
    console.log("Checking Firebase Auth state...");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User is signed in:", user.uid);
        // Fetch user information after confirming auth state
        await fetchUserInfo(user);
      } else {
        console.log("User is signed out, redirecting...");
        navigate("/"); // If user is not signed in, redirect to login
      }
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, [navigate]);

  const fetchUserInfo = async (user) => {
    try {
      console.log("Fetching user info for:", user.uid);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data fetched:", userData);
        
        // Set the username for display
        setUserName(`${userData.firstName} ${userData.lastName}`);
        
        // Check if the user's role is "ACAF"
        if (userData.role === "ACAF") {
          console.log("User is ACAF, loading dashboard...");
          setIsAuthenticated(true); // User is authenticated and authorized
          // Fetch dean data after confirming the role
          fetchDeans();
        } else {
          console.log("User role is not ACAF, redirecting...");
          navigate("/"); // Redirect if the user is not ACAF
        }
      } else {
        console.error("User data not found, redirecting...");
        setError("User data not found.");
        setLoading(false);
        navigate("/"); // Redirect if no user data found
      }
    } catch (err) {
      console.error("Error fetching user data:", err.message);
      setError(`Failed to fetch user data: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchDeans = async () => {
    try {
      console.log("Fetching deans...");
      const deanQuery = query(collection(db, "users"), where("role", "==", "Dean"));
      onSnapshot(deanQuery, (snapshot) => {
        setDeanList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
    } catch (err) {
      console.error("Error fetching deans:", err.message);
      setError(`Failed to fetch deans: ${err.message}`);
      setLoading(false);
    }
  };

  const handleEvaluateDean = (deanId) => {
    navigate(`/evaluate-dean/${deanId}`, {
      state: { redirectTo: "/acaf-dashboard" }
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth); // Use the correct signOut method from Firebase Auth
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Display loading, errors, or unauthorized access
  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!isAuthenticated) {
    return <p>Unauthorized Access</p>; // Show unauthorized message only if not authenticated
  }

  return (
    <div className="acaf-dashboard">
      <nav>
      <div className="dashboardlogo-container">
            <img src="/spc.png" alt="Logo" className="dashboardlogo" />
          </div>
        <h1>ACAF Dashboard</h1>
        <div>
        <p style={{fontSize: "25px"}}><strong>{userName}</strong></p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      <section>
        <h2>Evaluate Deans</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Dean Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {deanList.map((dean) => (
              <tr key={dean.id}>
                <td>{dean.id}</td>
                <td>{dean.firstName} {dean.lastName}</td>
                <td>
                  <button className="table-evaluate-btn" onClick={() => handleEvaluateDean(dean.id)}>Evaluate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AcafDashboard;
