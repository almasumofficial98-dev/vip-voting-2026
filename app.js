document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const dashboardBtn = document.getElementById('nav-dashboard');
    const studentVoteBtn = document.getElementById('nav-student-vote');
    const staffVoteBtn = document.getElementById('nav-staff-vote');
    const logoutBtn = document.getElementById('nav-logout');

    let allData = [];
    let currentView = 'student-vote'; // 'dashboard', 'student-vote', 'staff-vote', 'position'
    let activePosition = null;
    let isActivePositionStaff = false;
    let activeStaffRole = null; // { name: "Teachers", weight: 5 }
    let pendingAdminView = null;
    let unsubscribeCandidates = null;

    const STAFF_ROLES = [
        { name: "Leadership", weight: 20, icon: "👑" },
        { name: "Incharges", weight: 10, icon: "📝" },
        { name: "Teachers", weight: 5, icon: "🏫" },
        { name: "Supervisors", weight: 3, icon: "🔍" },
        { name: "Helping Staff", weight: 3, icon: "🤝" }
    ];

    // --- Core Application ---
    function init() {
        if (localStorage.getItem("vip_authenticated") !== "true") {
            document.getElementById('login-modal').style.display = 'flex';
            return;
        }

        // Revert from protected views if they try to access directly without admin authentication
        if ((currentView === 'dashboard' || currentView === 'staff-vote') && localStorage.getItem("vip_staff_authenticated") !== "true") {
            currentView = 'student-vote';
        }

        document.getElementById('app').style.display = 'flex';
        renderLoader();
        
        // Subscribe to student candidates updates
        if (unsubscribeCandidates) unsubscribeCandidates();
        unsubscribeCandidates = subscribeToCandidates((data) => {
            allData = data;
            triggerRender();
        });
    }

    function triggerRender() {
        if (currentView === 'dashboard') {
            renderDashboard();
        } else if (currentView === 'student-vote') {
            renderStudentVotePositions();
        } else if (currentView === 'staff-vote') {
            renderStaffVotePositions();
        } else if (currentView === 'position' && activePosition) {
            renderPosition(activePosition, isActivePositionStaff);
        }
    }

    function renderLoader() {
        mainContent.innerHTML = '<div class="loader">Loading Live Data...</div>';
    }

    // --- Dashboard View ---
    function renderDashboard() {
        currentView = 'dashboard';
        dashboardBtn.classList.add('active');
        studentVoteBtn.classList.remove('active');
        staffVoteBtn.classList.remove('active');

        // Calculate total vote points cast across all candidates
        const totalVotes = allData.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0);

        let html = `
            <div class="dashboard-header-card">
                <h1>Live Election Dashboard</h1>
                <div class="stats-counter">
                    <span class="stats-num">${totalVotes}</span>
                    <span class="stats-label">Total Vote Points Cast</span>
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

        const positions = CONFIG.POSITIONS_ORDER;

        positions.forEach(pos => {
            const posCandidates = allData
                .filter(c => c.Position && c.Position.trim().toLowerCase() === pos.trim().toLowerCase())
                .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

            const totalPosVotes = posCandidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);

            html += `
                <div class="dash-pos-card">
                    <div class="dash-pos-header">
                        <h3>${pos}</h3>
                        <span class="total-pos-votes">${totalPosVotes} pts</span>
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

    // --- Student Vote Positions Listing ---
    function renderStudentVotePositions() {
        currentView = 'student-vote';
        dashboardBtn.classList.remove('active');
        studentVoteBtn.classList.add('active');
        staffVoteBtn.classList.remove('active');

        let html = `
            <h1 class="page-title">Select Position to Cast Vote</h1>
            <div class="positions-grid">
        `;

        const positions = CONFIG.POSITIONS_ORDER;

        positions.forEach(position => {
            html += `
                <div class="position-card" onclick="window.renderPosition('${position.replace(/'/g, "\\'")}', false)">
                    <h3 class="position-title">${position}</h3>
                </div>
            `;
        });

        html += `</div>`;
        mainContent.innerHTML = html;
    }

    // --- Staff Designation Selection ---
    function renderStaffRoleSelection() {
        currentView = 'staff-vote';
        dashboardBtn.classList.remove('active');
        studentVoteBtn.classList.remove('active');
        staffVoteBtn.classList.add('active');

        let html = `
            <h1 class="page-title">Staff Verification</h1>
            <p style="text-align: center; color: var(--text-secondary); margin-bottom: 2rem;">Select your staff role to configure vote weight multipliers.</p>
            <div class="positions-grid" style="max-width: 800px; margin: 0 auto;">
        `;

        STAFF_ROLES.forEach((role, idx) => {
            html += `
                <div class="position-card" onclick="window.selectStaffRole(${idx})" style="padding: 2.5rem 1.5rem;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${role.icon}</div>
                    <h3 class="position-title" style="margin-bottom: 0.5rem;">${role.name}</h3>
                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-primary); background: rgba(168, 35, 41, 0.08); padding: 0.25rem 0.75rem; border-radius: 99px;">
                        Weight: ${role.weight}x
                    </span>
                </div>
            `;
        });

        html += `</div>`;
        mainContent.innerHTML = html;
    }

    window.selectStaffRole = function(idx) {
        activeStaffRole = STAFF_ROLES[idx];
        renderStaffVotePositions();
    };

    window.changeStaffRole = function() {
        activeStaffRole = null;
        renderStaffRoleSelection();
    };

    // --- Staff Vote Positions Listing ---
    function renderStaffVotePositions() {
        if (!activeStaffRole) {
            renderStaffRoleSelection();
            return;
        }

        currentView = 'staff-vote';
        dashboardBtn.classList.remove('active');
        studentVoteBtn.classList.remove('active');
        staffVoteBtn.classList.add('active');

        let html = `
            <div class="dashboard-header-card" style="padding: 1.5rem 2rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="text-align: left;">
                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Staff Mode Enabled</span>
                    <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; color: var(--accent-primary); margin: 0.25rem 0 0 0;">
                        ${activeStaffRole.icon} ${activeStaffRole.name} (${activeStaffRole.weight} votes per selection)
                    </h2>
                </div>
                <button class="nav-btn" onclick="window.changeStaffRole()" style="border: 1px solid var(--border-color); background: white;">
                    🔄 Change Role
                </button>
            </div>

            <h1 class="page-title">Select Position to Cast Staff Vote</h1>
            <div class="positions-grid">
        `;

        const positions = CONFIG.POSITIONS_ORDER;

        positions.forEach(position => {
            html += `
                <div class="position-card" onclick="window.renderPosition('${position.replace(/'/g, "\\'")}', true)">
                    <h3 class="position-title">${position}</h3>
                </div>
            `;
        });

        html += `</div>`;
        mainContent.innerHTML = html;
    }

    // --- Candidate Voting Page ---
    window.renderPosition = function(positionName, isStaff) {
        currentView = 'position';
        activePosition = positionName;
        isActivePositionStaff = isStaff;
        dashboardBtn.classList.remove('active');
        studentVoteBtn.classList.remove('active');
        staffVoteBtn.classList.remove('active');
        
        const normalizedPosName = positionName.trim().toLowerCase();
        const candidates = allData.filter(c => c.Position && c.Position.trim().toLowerCase() === normalizedPosName);
        
        let html = `
            <button class="back-btn" onclick="window.renderBackToPositions(${isStaff})">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Positions
            </button>
        `;

        if (isStaff && activeStaffRole) {
            html += `
                <div style="background: rgba(168, 35, 41, 0.03); border: 1px solid rgba(168, 35, 41, 0.1); padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; float: right; font-size: 0.9rem; color: var(--accent-primary);">
                    <span>${activeStaffRole.icon} Voting as <strong>${activeStaffRole.name}</strong> (${activeStaffRole.weight}x multiplier)</span>
                </div>
            `;
        }

        html += `
            <h1 class="page-title" style="clear: both; padding-top: 1rem;">Vote for ${positionName}</h1>
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
                            <button class="vote-btn" onclick="window.handleVote('${candidate.id}', '${positionName.replace(/'/g, "\\'")}', ${isStaff})">
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

    window.renderBackToPositions = function(isStaff) {
        if (isStaff) {
            renderStaffVotePositions();
        } else {
            renderStudentVotePositions();
        }
    };

    window.handleVote = function(candidateId, positionName, isStaff) {
        const candidate = allData.find(c => c.id === candidateId);
        const candidateName = candidate ? candidate.Name : "this candidate";
        const weight = (isStaff && activeStaffRole) ? activeStaffRole.weight : 1;

        const confirmModal = document.getElementById('confirm-modal');
        const confirmCandText = document.getElementById('confirm-candidate-name');
        const confirmPosText = document.getElementById('confirm-position-name');
        const confirmOkBtn = document.getElementById('confirm-ok-btn');
        const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

        confirmCandText.textContent = `"${candidateName}"`;
        confirmPosText.textContent = `"${positionName}"`;

        // Customize confirmation question text if staff
        const confirmParagraph = confirmModal.querySelector('p');
        if (isStaff && activeStaffRole) {
            confirmParagraph.innerHTML = `Are you sure you want to cast a <strong>Staff Vote (${activeStaffRole.name} - ${activeStaffRole.weight} votes)</strong> for <strong id="confirm-candidate-name" style="color: var(--accent-primary); font-weight: 700;">"${candidateName}"</strong> for the role of <strong id="confirm-position-name" style="color: var(--text-primary); font-weight: 700;">"${positionName}"</strong>?`;
        } else {
            confirmParagraph.innerHTML = `Are you sure you want to cast your vote for <strong id="confirm-candidate-name" style="color: var(--accent-primary); font-weight: 700;">"${candidateName}"</strong> for the role of <strong id="confirm-position-name" style="color: var(--text-primary); font-weight: 700;">"${positionName}"</strong>?`;
        }

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
            const success = await castVote(candidateId, weight);
            if (success) {
                const successModal = document.getElementById('success-modal');
                successModal.style.display = 'flex';
                
                setTimeout(() => {
                    successModal.style.display = 'none';
                    window.renderPosition(positionName, isStaff); 
                }, 2500);
            } else {
                window.renderPosition(positionName, isStaff);
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
            currentView = 'student-vote';
            init();
        } else {
            errorMsg.style.display = 'block';
            passInput.value = '';
            passInput.focus();
        }
    };

    window.handleAdminLogin = function(event) {
        event.preventDefault();
        const idInput = document.getElementById('admin-login-id');
        const passInput = document.getElementById('admin-login-password');
        const errorMsg = document.getElementById('admin-login-error');

        const id = idInput.value.trim();
        const password = passInput.value;

        if (id === 'qwerty' && password === 'ytrewq') {
            localStorage.setItem("vip_staff_authenticated", "true");
            document.getElementById('admin-login-modal').style.display = 'none';
            errorMsg.style.display = 'none';
            idInput.value = '';
            passInput.value = '';
            
            if (pendingAdminView === 'dashboard') {
                renderDashboard();
            } else if (pendingAdminView === 'staff-vote') {
                renderStaffVotePositions();
            } else {
                renderStudentVotePositions();
            }
            pendingAdminView = null;
        } else {
            errorMsg.style.display = 'block';
            passInput.value = '';
            passInput.focus();
        }
    };

    window.cancelAdminLogin = function() {
        document.getElementById('admin-login-modal').style.display = 'none';
        document.getElementById('admin-login-error').style.display = 'none';
        document.getElementById('admin-login-id').value = '';
        document.getElementById('admin-login-password').value = '';
        pendingAdminView = null;
        triggerRender();
    };

    // Navigation triggers
    dashboardBtn.addEventListener('click', () => {
        if (localStorage.getItem("vip_staff_authenticated") === "true") {
            renderDashboard();
        } else {
            pendingAdminView = 'dashboard';
            document.getElementById('admin-login-modal').style.display = 'flex';
        }
    });

    studentVoteBtn.addEventListener('click', renderStudentVotePositions);

    staffVoteBtn.addEventListener('click', () => {
        if (localStorage.getItem("vip_staff_authenticated") === "true") {
            renderStaffVotePositions();
        } else {
            pendingAdminView = 'staff-vote';
            document.getElementById('admin-login-modal').style.display = 'flex';
        }
    });

    logoutBtn.addEventListener('click', () => {
        const isStaffMode = (currentView === 'staff-vote' || (currentView === 'position' && isActivePositionStaff) || currentView === 'dashboard');
        
        if (isStaffMode) {
            // Logout admin/staff session only, revert to student voting
            localStorage.removeItem("vip_staff_authenticated");
            currentView = 'student-vote';
            renderStudentVotePositions();
        } else {
            // Log out student session completely
            localStorage.removeItem("vip_authenticated");
            localStorage.removeItem("vip_staff_authenticated");
            document.getElementById('app').style.display = 'none';
            document.getElementById('login-modal').style.display = 'flex';
        }
    });

    window.renderVoteView = renderStudentVotePositions;
    window.renderHomeView = renderDashboard;

    // Run app!
    init();
});
