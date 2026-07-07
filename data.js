// ==========================================
// MOCK DATA (Used for initial setup)
// ==========================================
const MOCK_DATA = [
    { Position: "Head Boy", Name: "Mohammed Abrar Mohiuddin", Grade: "9B" },
    { Position: "Head Boy", Name: "Ebrahim M.G. Siddiqui", Grade: "9B" },
    { Position: "Head Boy", Name: "Mohammed Abdul Qawi", Grade: "9B" },
    
    { Position: "Deputy Head Boy", Name: "Fahad Jawad Ahmed", Grade: "9B" },
    { Position: "Deputy Head Boy", Name: "Kazi mohammed amauddin", Grade: "9B" },
    { Position: "Deputy Head Boy", Name: "Aaniq ur rahman", Grade: "9B" },
    
    { Position: "Head Girl", Name: "Suhana Parvin", Grade: "9C" },
    { Position: "Head Girl", Name: "Areeba imran", Grade: "9A" },
    { Position: "Head Girl", Name: "Hani", Grade: "9C" },
    
    { Position: "Deputy Head Girl", Name: "Huda Fatima", Grade: "9C" },
    { Position: "Deputy Head Girl", Name: "Zoha Syeda", Grade: "9A" },
    { Position: "Deputy Head Girl", Name: "Simrah Naser", Grade: "9A" },
    
    { Position: "Sports Captain", Name: "Labeeb Bin Sajid", Grade: "9B" },
    { Position: "Sports Captain", Name: "Omer Mohiuddin", Grade: "9B" },
    
    { Position: "Sports Vice Captain", Name: "Mohammed Omer", Grade: "8B" },
    { Position: "Sports Vice Captain", Name: "Syed Amjad Iqbal Razvi", Grade: "8B" },
    { Position: "Sports Vice Captain", Name: "Abdullah Salman", Grade: "8B" },
    
    { Position: "Challengers Captain", Name: "Yousuf unnisa", Grade: "9C" },
    { Position: "Challengers Captain", Name: "Nada sultana", Grade: "9C" },
    { Position: "Challengers Captain", Name: "Meher Noor khan", Grade: "9C" },
    
    { Position: "Challengers Vice Captain", Name: "Safia Tahreem", Grade: "8A" },
    { Position: "Challengers Vice Captain", Name: "Manha Ahmed", Grade: "8A" },
    { Position: "Challengers Vice Captain", Name: "Husna Sadia", Grade: "8D" },
    
    { Position: "Champions captain", Name: "Syed Habeeb Uddin", Grade: "9B" },
    { Position: "Champions captain", Name: "Ataullah Shareef", Grade: "9B" },
    
    { Position: "Champions Vice captain", Name: "Mohammed Affan", Grade: "8C" },
    { Position: "Champions Vice captain", Name: "Abdul Hadi", Grade: "8B" },
    
    { Position: "Superior Captain", Name: "Airxa fatima", Grade: "9A" },
    { Position: "Superior Captain", Name: "Sheema Fatima", Grade: "9A" },
    
    { Position: "Superior Vice Captain", Name: "Rida Fatima", Grade: "8A" },
    { Position: "Superior Vice Captain", Name: "Juweriyah Nashrah", Grade: "8A" },
    { Position: "Superior Vice Captain", Name: "Farzana khatun", Grade: "8D" },
    { Position: "Superior Vice Captain", Name: "Samia Khan", Grade: "8D" },
    
    { Position: "Warrior Captain", Name: "Mohammed Sabeeh Ahmed", Grade: "9B" },
    { Position: "Warrior Captain", Name: "Mustafa", Grade: "9B" },
    { Position: "Warrior Captain", Name: "Mohammed Abdul Haseeb", Grade: "9B" },
    
    { Position: "Warrior Vice Captain", Name: "Abdur Rahman", Grade: "8C" },
    { Position: "Warrior Vice Captain", Name: "Mohammed Rayyan", Grade: "8C" },
    { Position: "Warrior Vice Captain", Name: "Hisham Mujahed Ali", Grade: "8C" },
    { Position: "Warrior Vice Captain", Name: "Anas Bin Mahfooz", Grade: "8B" },
    
    { Position: "Apple Club Captain", Name: "Zaara Amreen", Grade: "9A" },
    { Position: "Apple Club Captain", Name: "Hurriya khan", Grade: "9A" },
    { Position: "Apple Club Captain", Name: "Sabreen Samad Khan", Grade: "9A" },
    { Position: "Apple Club Captain", Name: "Syeda Kayenath Hussaini", Grade: "9A" },
    { Position: "Apple Club Captain", Name: "Sana Firdous", Grade: "9C" },
    
    { Position: "Apple Club Vice Captain", Name: "Ayesha Samad Khan", Grade: "8A" },
    { Position: "Apple Club Vice Captain", Name: "Saima Fatima", Grade: "8D" },
    { Position: "Apple Club Vice Captain", Name: "ANAM KASHIF", Grade: "8D" },
    { Position: "Apple Club Vice Captain", Name: "Nadia Rafi Ahmed", Grade: "8D" },
    
    { Position: "Eco Club Captain", Name: "SYEDA KHATIJA FATIMA", Grade: "9A" },
    { Position: "Eco Club Captain", Name: "Sumaira Maheen", Grade: "9A" },
    { Position: "Eco Club Captain", Name: "Ayra Hidayat", Grade: "9A" },
    { Position: "Eco Club Captain", Name: "Yusra fathima", Grade: "9A" },

    { Position: "Eco Club Vice Captain", Name: "Khadija Khaja Moinuddin", Grade: "8A" }
];



// ==========================================
// FIREBASE DATA FUNCTIONS
// ==========================================

// 1. Fetch all candidates
async function fetchCandidates() {
    try {
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.log("Firebase not configured yet. Returning mock data.");
            return MOCK_DATA.map((c, i) => ({ ...c, id: `mock_${i}`, voteCount: 0 }));
        }

        const snapshot = await db.collection('candidates').get();
        if (snapshot.empty) {
            console.log("No candidates found in Firebase. You may need to run window.adminPopulateFirebase() in the console.");
            return [];
        }

        const candidates = [];
        snapshot.forEach(doc => {
            candidates.push({ id: doc.id, ...doc.data() });
        });
        return candidates;
    } catch (error) {
        console.error("Error fetching from Firebase:", error);
        return [];
    }
}

// 2. Subscribe to candidates in real-time
function subscribeToCandidates(callback) {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        // Return mock unsubscribe function and immediate callback with mock data
        callback(MOCK_DATA.map((c, i) => ({ ...c, id: `mock_${i}`, voteCount: Math.floor(Math.random() * 10) })));
        return () => {};
    }

    return db.collection('candidates').onSnapshot(snapshot => {
        const candidates = [];
        snapshot.forEach(doc => {
            candidates.push({ id: doc.id, ...doc.data() });
        });
        callback(candidates);
    }, error => {
        console.error("Error in real-time subscription:", error);
    });
}

// 3. Cast a vote with a specific weight (default is 1 for students, higher for staff roles)
async function castVote(candidateId, weight = 1) {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        alert(`Firebase is not configured yet. Simulated casting a vote with weight ${weight}.`);
        return true; 
    }

    try {
        const candidateRef = db.collection('candidates').doc(candidateId);
        await candidateRef.update({
            voteCount: firebase.firestore.FieldValue.increment(weight)
        });
        return true;
    } catch (error) {
        console.error("Voting failed:", error);
        alert("Failed to submit vote. Please try again.");
        return false;
    }
}

// 4. Admin Helper: Run this ONCE in the browser console to push all MOCK_DATA to Firebase
window.adminPopulateFirebase = async function() {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        alert("Configure Firebase first!");
        return;
    }
    console.log("Uploading candidates to Firebase...");
    let count = 0;
    for (const candidate of MOCK_DATA) {
        await db.collection('candidates').add({
            Name: candidate.Name,
            Position: candidate.Position,
            Grade: candidate.Grade,
            voteCount: 0
        });
        count++;
    }
    console.log(`Successfully uploaded ${count} candidates to Firebase!`);
}

// 5. Reset all votes to 0 in Firebase
async function resetAllVotes() {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.log("Firebase not configured yet. Simulated resetting mock data.");
        return true;
    }

    try {
        const snapshot = await db.collection('candidates').get();
        if (snapshot.empty) {
            console.log("No candidates to reset.");
            return true;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { voteCount: 0 });
        });

        await batch.commit();
        console.log("All student candidate votes successfully reset in Firebase!");
        return true;
    } catch (error) {
        console.error("Error resetting votes in Firebase:", error);
        alert("Failed to reset database: " + error.message);
        return false;
    }
}



