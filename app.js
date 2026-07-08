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
    let previousData = [];
    let recentVoteLogs = [];
    let inspectedPosition = null;
    let unsubscribeCandidates = null;

    const STAFF_ROLES = [
        { 
            name: "Leadership", 
            weight: 20, 
            icon: `<svg class="role-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>` 
        },
        { 
            name: "Incharges", 
            weight: 10, 
            icon: `<svg class="role-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>` 
        },
        { 
            name: "Teachers", 
            weight: 5, 
            icon: `<svg class="role-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>` 
        },
        { 
            name: "Supervisors", 
            weight: 3, 
            icon: `<svg class="role-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>` 
        },
        { 
            name: "Helping Staff", 
            weight: 3, 
            icon: `<svg class="role-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>` 
        }
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
            // Track live updates and log them
            if (previousData.length > 0) {
                data.forEach(candidate => {
                    const prev = previousData.find(c => c.id === candidate.id);
                    if (prev && (candidate.voteCount || 0) > (prev.voteCount || 0)) {
                        const diff = (candidate.voteCount || 0) - (prev.voteCount || 0);
                        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        recentVoteLogs.unshift({
                            text: `Added +${diff} pts for ${candidate.Name} (${candidate.Position})`,
                            time: timestamp
                        });
                        if (recentVoteLogs.length > 6) recentVoteLogs.pop(); // keep last 6 logs
                    }
                });
            } else {
                const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                recentVoteLogs = [
                    { text: "Election system loaded. Listening for live updates...", time: timestamp }
                ];
            }
            previousData = JSON.parse(JSON.stringify(data)); // deep clone
            
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

        // Ensure we have a default inspected position
        if (!inspectedPosition && CONFIG.POSITIONS_ORDER.length > 0) {
            inspectedPosition = CONFIG.POSITIONS_ORDER[0];
        }

        // Left Column: Inspected Position Race Details
        let candRowsHTML = "";
        let statusHTML = "";
        const positions = CONFIG.POSITIONS_ORDER;

        if (inspectedPosition) {
            const normalizedPos = inspectedPosition.trim().toLowerCase();
            const candList = allData
                .filter(c => c.Position && c.Position.trim().toLowerCase() === normalizedPos)
                .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

            const totalPosVotes = candList.reduce((sum, c) => sum + (c.voteCount || 0), 0);

            // Compute smart race status banner for the inspected position
            if (candList.length > 0) {
                const topVotes = candList[0].voteCount || 0;
                const runnerVotes = candList[1] ? (candList[1].voteCount || 0) : 0;
                const diff = topVotes - runnerVotes;
                
                if (topVotes === 0) {
                    statusHTML = `
                        <div class="status-pill no-votes">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            No votes yet
                        </div>
                    `;
                } else if (diff === 0 && candList.length > 1) {
                    statusHTML = `
                        <div class="status-pill close-race" style="background: #fffbeb; color: #d97706; border-color: #fde68a;">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Tie! (${topVotes} pts each)
                        </div>
                    `;
                } else if (diff <= 2 && candList.length > 1) {
                    statusHTML = `
                        <div class="status-pill close-race">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Close Race! (Diff: ${diff} pts)
                        </div>
                    `;
                } else {
                    statusHTML = `
                        <div class="status-pill clear-leader">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                            Clear Leader (Diff: ${diff} pts)
                        </div>
                    `;
                }
            }

            candList.forEach((cand, idx) => {
                const percentage = totalPosVotes > 0 ? Math.round((cand.voteCount / totalPosVotes) * 100) : 0;
                const initials = cand.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                let rankBadge = "";
                let fillBg = "var(--accent-secondary)";
                
                if (cand.voteCount > 0) {
                    const isTopVotes = cand.voteCount === candList[0].voteCount;
                    const isRunnerVotes = candList[1] && cand.voteCount === candList[1].voteCount && !isTopVotes;
                    const isTied = candList[1] && candList[0].voteCount === candList[1].voteCount;

                    if (isTopVotes) {
                        rankBadge = `<span class="rank-badge rank-1">${isTied ? '🤝 Tied' : '🏆 Leader'}</span>`;
                        fillBg = "var(--accent-primary)";
                    } else if (isRunnerVotes) {
                        rankBadge = `<span class="rank-badge rank-2">🥈 Runner-up</span>`;
                    }
                }

                candRowsHTML += `
                    <div class="inspector-cand-row">
                        <div class="inspector-cand-header">
                            <div class="inspector-cand-profile">
                                <div class="inspector-cand-avatar">${initials}</div>
                                <div>
                                    <div class="inspector-cand-name">${cand.Name}</div>
                                    <div class="inspector-cand-grade">Grade: ${cand.Grade} &nbsp;${rankBadge}</div>
                                </div>
                            </div>
                            <div class="inspector-cand-votes">${cand.voteCount || 0} pts (${percentage}%)</div>
                        </div>
                        <div class="inspector-progress-bg">
                            <div class="inspector-progress-fill" style="width: ${percentage}%; background: ${fillBg};"></div>
                        </div>
                    </div>
                `;
            });

            if (candList.length === 0) {
                candRowsHTML = `<p style="color: var(--text-secondary); text-align: center; font-size: 0.9rem; padding: 1.5rem 0;">No candidates for this position.</p>`;
            }
        }

        // Right Column: Interactive Grid
        let gridHTML = "";
        positions.forEach(pos => {
            const posCandidates = allData
                .filter(c => c.Position && c.Position.trim().toLowerCase() === pos.trim().toLowerCase())
                .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

            const leader = posCandidates[0];
            const isTied = posCandidates[1] && posCandidates[0].voteCount === posCandidates[1].voteCount && posCandidates[0].voteCount > 0;
            const leaderName = leader && leader.voteCount > 0 ? (isTied ? "Tied" : leader.Name.split(' ')[0]) : "No votes";
            const leaderPts = leader ? (leader.voteCount || 0) : 0;
            const isActive = pos === inspectedPosition ? "active" : "";

            gridHTML += `
                <div class="compact-pos-card ${isActive}" onclick="window.selectInspectedPosition('${pos.replace(/'/g, "\\'")}')">
                    <h4 class="compact-pos-title">${pos}</h4>
                    <div class="compact-pos-leader">
                        <span>Leader: <strong>${leaderName}</strong></span>
                        <span class="compact-pos-pts">${leaderPts} pts</span>
                    </div>
                </div>
            `;
        });

        let html = `
            <div class="dashboard-header-card" style="margin-bottom: 1.5rem; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="text-align: left;">
                    <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">VIP Council Elections 2026</span>
                    <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--accent-primary); margin: 0.25rem 0 0 0; background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Live Election Dashboard</h1>
                </div>
                <div style="display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;">
                    <div style="text-align: right; display: flex; gap: 1.5rem; align-items: center;">
                        <div style="text-align: right;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: block;">Total Vote Points</span>
                            <strong style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary); line-height: 1.1;">${totalVotes}</strong>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: block;">Active Races</span>
                            <strong style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary); line-height: 1.1;">${positions.length}</strong>
                        </div>
                    </div>
                    <button class="reset-db-btn" onclick="window.handleResetDatabase()" style="margin-top: 0; padding: 0.6rem 1.5rem;">
                        <svg style="vertical-align: middle; margin-right: 0.5rem;" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Reset Database
                    </button>
                </div>
            </div>

            <!-- Two Column Interactive Layout -->
            <div class="dashboard-two-col">
                <!-- Left Column: Inspector Focus Card -->
                <div class="hero-detail-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; width: 100%;">
                        <div style="text-align: left;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Currently Inspecting</span>
                            <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; color: var(--accent-primary); margin: 0.15rem 0 0 0;">${inspectedPosition}</h2>
                        </div>
                        ${statusHTML}
                    </div>
                    <div style="border-bottom: 1px solid var(--border-color); width: 100%;"></div>
                    <div class="inspector-candidates-list">
                        ${candRowsHTML}
                    </div>
                </div>

                <!-- Right Column: Interactive Grid -->
                <div>
                    <h2 class="section-title" style="margin-top: 0; margin-bottom: 1rem; font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; color: var(--text-primary);">Positions Overview</h2>
                    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 0;">
                        ${gridHTML}
                    </div>
                </div>
            </div>
        `;
        mainContent.innerHTML = html;
    }

    window.selectInspectedPosition = function(posName) {
        inspectedPosition = posName;
        renderDashboard();
    };

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
                    <div style="margin-bottom: 1rem; display: flex; justify-content: center; align-items: center;">${role.icon}</div>
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
            <div class="dashboard-header-card staff-banner" style="padding: 1.5rem 2rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div style="text-align: left; display: flex; align-items: center; gap: 0.75rem;">
                    <div style="background: rgba(168, 35, 41, 0.08); border-radius: 12px; padding: 0.5rem; display: flex; align-items: center;">
                        ${activeStaffRole.icon}
                    </div>
                    <div>
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Staff Mode Enabled</span>
                        <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; color: var(--accent-primary); margin: 0.15rem 0 0 0;">
                            ${activeStaffRole.name} (${activeStaffRole.weight} votes per selection)
                        </h2>
                    </div>
                </div>
                <button class="nav-btn" onclick="window.changeStaffRole()" style="border: 1px solid var(--border-color); background: white; display: flex; align-items: center; gap: 0.25rem;">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" /></svg>
                    Change Role
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

    function getCandidateImageSources(candidate) {
        if (!candidate || !candidate.Name || !candidate.Position || !candidate.Grade) {
            return ['placeholder.png'];
        }
        
        const sources = [];
        const nameParts = candidate.Name.split(' ').map(p => p.trim()).filter(p => p.length > 0);
        const position = candidate.Position.trim();
        const grade = candidate.Grade.trim();
        const extensions = ['jpeg', 'jpg', 'png', 'JPG'];

        // 1. Try name parts
        nameParts.forEach(part => {
            extensions.forEach(ext => {
                sources.push(`Images/${position}/${part} - ${position} - ${grade}.${ext}`);
            });
        });

        // 2. Try full name
        extensions.forEach(ext => {
            sources.push(`Images/${position}/${candidate.Name.trim()} - ${position} - ${grade}.${ext}`);
        });

        // 3. Fallback to placeholder
        sources.push('placeholder.png');
        
        return sources;
    }

    window.handleImageError = function(img) {
        try {
            const sources = JSON.parse(img.getAttribute('data-sources'));
            let index = parseInt(img.getAttribute('data-source-index') || '0', 10);
            index++;
            if (sources && index < sources.length) {
                img.setAttribute('data-source-index', index);
                img.src = sources[index];
            } else {
                img.src = 'placeholder.png';
                img.onerror = null;
            }
        } catch (e) {
            img.src = 'placeholder.png';
            img.onerror = null;
        }
    };

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
                <div class="staff-banner-badge" style="background: rgba(168, 35, 41, 0.03); border: 1px solid rgba(168, 35, 41, 0.1); padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; float: right; font-size: 0.9rem; color: var(--accent-primary);">
                    ${activeStaffRole.icon}
                    <span>Voting as <strong>${activeStaffRole.name}</strong> (${activeStaffRole.weight}x multiplier)</span>
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
                const sources = getCandidateImageSources(candidate);
                html += `
                    <div class="candidate-card">
                        <div class="candidate-img-wrapper">
                            <img src="${sources[0]}" 
                                 data-sources='${JSON.stringify(sources)}' 
                                 data-source-index="0" 
                                 onerror="window.handleImageError(this)" 
                                 alt="${candidate.Name}" 
                                 class="candidate-img">
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
