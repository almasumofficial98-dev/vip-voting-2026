document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const dashboardBtn = document.getElementById('nav-dashboard');
    const voteBtn = document.getElementById('nav-vote');

    let allData = [];
    let currentView = 'dashboard'; // 'dashboard', 'vote', 'position'
    let activePosition = null;
    let unsubscribeCandidates = null;

    // --- Core Application ---
    function init() {
        if (localStorage.getItem("vip_authenticated") !== "true") {
            document.getElementById('login-modal').style.display = 'flex';
            return;
        }

        document.getElementById('app').style.display = 'flex';
        renderLoader();
        
        // Subscribe to real-time updates immediately
        if (unsubscribeCandidates) unsubscribeCandidates();
        
        unsubscribeCandidates = subscribeToCandidates((data) => {
            allData = data;
            // Update the currently active view dynamically when data updates
            if (currentView === 'dashboard') {
                renderDashboard();
            } else if (currentView === 'vote') {
                renderVotePositions();
            } else if (currentView === 'position' && activePosition) {
                renderPosition(activePosition);
            }
        });
    }

    function renderLoader() {
        mainContent.innerHTML = '<div class="loader">Loading Live Data...</div>';
    }

    // --- Dashboard View ---
    function renderDashboard() {
        currentView = 'dashboard';
        dashboardBtn.classList.add('active');
        voteBtn.classList.remove('active');

        // Calculate total votes cast across all candidates
        const totalVotes = allData.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0);

        let html = `
            <div class="dashboard-header-card">
                <h1>Live Election Dashboard</h1>
                <div class="stats-counter">
                    <span class="stats-num">${totalVotes}</span>
                    <span class="stats-label">Total Votes Cast</span>
                </div>
                <div style="margin-top: 1.5rem;">
                    <button class="reset-db-btn" onclick="window.handleResetDatabase()">
                        <svg style="vertical-align: middle; margin-right: 0.5rem;" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Reset Database
                    </button>
                </div>
            </div>
            
            <h2 class="section-title" style="margin-top: 2rem;">Real-time Position Leaders</h2>
            <div class="dashboard-grid">
        `;

        const positions = [
            "Head Boy", "Deputy Head Boy", "Head Girl", "Deputy Head Girl",
            "Sports Captain", "Sports Vice Captain", "Challengers Captain", "Challengers Vice Captain",
            "Champions captain", "Champions Vice captain", "Superior Captain", "Superior Vice Captain",
            "Warrior Captain", "Warrior Vice Captain", "Apple Club Captain", "Apple Club Vice Captain",
            "Eco Club Captain", "Eco Club Vice Captain"
        ];

        positions.forEach(pos => {
            const posCandidates = allData
                .filter(c => c.Position && c.Position.trim().toLowerCase() === pos.trim().toLowerCase())
                .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

            const totalPosVotes = posCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
            const leader = posCandidates[0];

            html += `
                <div class="dash-pos-card">
                    <div class="dash-pos-header">
                        <h3>${pos}</h3>
                        <span class="total-pos-votes">${totalPosVotes} votes</span>
                    </div>
                    <div class="dash-candidates-list">
            `;

            if (posCandidates.length === 0) {
                html += `<p style="color: var(--text-secondary); font-size: 0.9rem;">No candidates yet.</p>`;
            } else {
                posCandidates.forEach((candidate, index) => {
                    const percentage = totalPosVotes > 0 ? Math.round((candidate.voteCount / totalPosVotes) * 100) : 0;
                    const isLeader = index === 0 && candidate.voteCount > 0;
                    
                    html += `
                        <div class="dash-candidate-row">
                            <div class="dash-cand-info">
                                <span class="cand-name-rank">${isLeader ? '👑 ' : ''}${candidate.Name} (${candidate.Grade})</span>
                                <span class="cand-vote-val">${candidate.voteCount || 0} (${percentage}%)</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${percentage}%; background: ${isLeader ? 'var(--accent-primary)' : 'var(--accent-secondary)'};"></div>
                            </div>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        mainContent.innerHTML = html;
    }

    // --- Vote Positions Listing ---
    function renderVotePositions() {
        currentView = 'vote';
        dashboardBtn.classList.remove('active');
        voteBtn.classList.add('active');

        let html = `
            <h1 class="page-title">Select Position to Cast Vote</h1>
            <div class="positions-grid">
        `;

        const positions = [
            "Head Boy", "Deputy Head Boy", "Head Girl", "Deputy Head Girl",
            "Sports Captain", "Sports Vice Captain", "Challengers Captain", "Challengers Vice Captain",
            "Champions captain", "Champions Vice captain", "Superior Captain", "Superior Vice Captain",
            "Warrior Captain", "Warrior Vice Captain", "Apple Club Captain", "Apple Club Vice Captain",
            "Eco Club Captain", "Eco Club Vice Captain"
        ];

        positions.forEach(position => {
            html += `
                <div class="position-card" onclick="window.renderPosition('${position.replace(/'/g, "\\'")}')">
                    <h3 class="position-title">${position}</h3>
                </div>
            `;
        });

        html += `</div>`;
        mainContent.innerHTML = html;
    }

    // --- Candidate Voting Page ---
    window.renderPosition = function(positionName) {
        currentView = 'position';
        activePosition = positionName;
        dashboardBtn.classList.remove('active');
        voteBtn.classList.remove('active');
        
        const normalizedPosName = positionName.trim().toLowerCase();
        const candidates = allData.filter(c => c.Position && c.Position.trim().toLowerCase() === normalizedPosName);
        
        let html = `
            <h1 class="page-title">Vote for ${positionName}</h1>
        `;

        if (candidates.length === 0) {
            html += `<p style="text-align: center; color: var(--text-secondary);">No candidates found for this position.</p>`;
        } else {
            html += `<div class="candidates-grid">`;
            candidates.forEach(candidate => {
                html += `
                    <div class="candidate-card">
                        <div class="candidate-img-wrapper">
                            <img src="placeholder.png" alt="${candidate.Name}" class="candidate-img">
                        </div>
                        <div class="candidate-info">
                            <h3 class="candidate-name">${candidate.Name}</h3>
                            <span class="candidate-grade">Grade: ${candidate.Grade}</span>
                            <button class="vote-btn" onclick="window.handleVote('${candidate.id}', '${positionName.replace(/'/g, "\\'")}')">
                                Vote
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        mainContent.innerHTML = html;
        window.scrollTo(0, 0);
    };

    window.handleVote = function(candidateId, positionName) {
        const candidate = allData.find(c => c.id === candidateId);
        const candidateName = candidate ? candidate.Name : "this candidate";

        const confirmModal = document.getElementById('confirm-modal');
        const confirmCandText = document.getElementById('confirm-candidate-name');
        const confirmPosText = document.getElementById('confirm-position-name');
        const confirmOkBtn = document.getElementById('confirm-ok-btn');
        const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

        confirmCandText.textContent = `"${candidateName}"`;
        confirmPosText.textContent = `"${positionName}"`;

        confirmModal.style.display = 'flex';

        const newConfirmOkBtn = confirmOkBtn.cloneNode(true);
        confirmOkBtn.parentNode.replaceChild(newConfirmOkBtn, confirmOkBtn);
        
        const newConfirmCancelBtn = confirmCancelBtn.cloneNode(true);
        confirmCancelBtn.parentNode.replaceChild(newConfirmCancelBtn, confirmCancelBtn);

        newConfirmCancelBtn.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });

        newConfirmOkBtn.addEventListener('click', async () => {
            confirmModal.style.display = 'none';
            renderLoader();
            const success = await castVote(candidateId);
            if (success) {
                const successModal = document.getElementById('success-modal');
                successModal.style.display = 'flex';
                
                setTimeout(() => {
                    successModal.style.display = 'none';
                    renderPosition(positionName); 
                }, 2500);
            } else {
                renderPosition(positionName);
            }
        });
    };

    window.handleResetDatabase = function() {
        const resetModal = document.getElementById('reset-modal');
        const resetConfirmBtn = document.getElementById('reset-confirm-btn');
        const resetCancelBtn = document.getElementById('reset-cancel-btn');

        resetModal.style.display = 'flex';

        const newConfirmBtn = resetConfirmBtn.cloneNode(true);
        resetConfirmBtn.parentNode.replaceChild(newConfirmBtn, resetConfirmBtn);

        const newCancelBtn = resetCancelBtn.cloneNode(true);
        resetCancelBtn.parentNode.replaceChild(newCancelBtn, resetCancelBtn);

        newCancelBtn.addEventListener('click', () => {
            resetModal.style.display = 'none';
        });

        newConfirmBtn.addEventListener('click', async () => {
            resetModal.style.display = 'none';
            renderLoader();
            const success = await resetAllVotes();
            if (success) {
                renderDashboard();
            } else {
                renderDashboard();
            }
        });
    };

    window.handleLogin = function(event) {
        event.preventDefault();
        const idInput = document.getElementById('login-id');
        const passInput = document.getElementById('login-password');
        const errorMsg = document.getElementById('login-error');

        const id = idInput.value.trim();
        const password = passInput.value;

        if (id === 'ashken' && password === 'kenash') {
            localStorage.setItem("vip_authenticated", "true");
            document.getElementById('login-modal').style.display = 'none';
            init();
        } else {
            errorMsg.style.display = 'block';
            passInput.value = '';
            passInput.focus();
        }
    };



    // Navigation triggers
    dashboardBtn.addEventListener('click', renderDashboard);
    voteBtn.addEventListener('click', renderVotePositions);

    window.renderVoteView = renderVotePositions;
    window.renderHomeView = renderDashboard;

    // Run app!
    init();
});
