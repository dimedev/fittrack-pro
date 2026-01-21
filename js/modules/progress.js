// ==================== PROGRESS MODULE ====================

let progressChart = null;

function populateProgressExerciseSelect() {
    const select = document.getElementById('progress-exercise');
    const exercises = Object.keys(state.progressLog).sort();

    if (exercises.length === 0) {
        select.innerHTML = '<option value="">Aucun exercice enregistré</option>';
        return;
    }

    select.innerHTML = '<option value="">Sélectionner un exercice</option>' +
        exercises.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

function updateProgressChart() {
    const exercise = document.getElementById('progress-exercise').value;
    const ctx = document.getElementById('progress-chart').getContext('2d');

    // Détruire le graphique existant
    if (progressChart) {
        progressChart.destroy();
        progressChart = null;
    }

    if (!exercise || !state.progressLog[exercise] || state.progressLog[exercise].length === 0) {
        // Afficher un message si pas de données
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#606070';
        ctx.font = '14px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('Sélectionnez un exercice pour voir votre progression', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const logs = state.progressLog[exercise];
    const labels = logs.map(l => {
        const date = new Date(l.date);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
    const weights = logs.map(l => l.weight);
    const reps = logs.map(l => l.achievedReps || 0);

    // Calculer le volume (poids x reps x séries)
    const volumes = logs.map(l => (l.weight * (l.achievedReps || 0) * l.sets) / 100);

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Poids (kg)',
                    data: weights,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Reps réalisées',
                    data: reps,
                    borderColor: '#00aaff',
                    backgroundColor: 'rgba(0, 170, 255, 0.1)',
                    tension: 0.3,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a0a0b0',
                        font: { family: 'Outfit' }
                    }
                },
                tooltip: {
                    backgroundColor: '#16161f',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#2a2a3a',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#606070',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#00ff88',
                        font: { family: 'Space Mono' }
                    },
                    title: {
                        display: true,
                        text: 'Poids (kg)',
                        color: '#00ff88'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#00aaff',
                        font: { family: 'Space Mono' }
                    },
                    title: {
                        display: true,
                        text: 'Reps',
                        color: '#00aaff'
                    }
                }
            }
        }
    });
}

function updateSessionHistory() {
    const container = document.getElementById('session-history');

    if (!state.sessionHistory || state.sessionHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-title">Aucune séance enregistrée</div>
                <p>Vos séances apparaîtront ici</p>
            </div>
        `;
        return;
    }

    // Grouper par date
    const sessionsByDate = {};
    state.sessionHistory.forEach(session => {
        if (!sessionsByDate[session.date]) {
            sessionsByDate[session.date] = [];
        }
        sessionsByDate[session.date].push(session);
    });

    container.innerHTML = Object.entries(sessionsByDate)
        .slice(0, 10)
        .map(([date, sessions]) => {
            const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            
            return sessions.map(session => `
                <div class="workout-day">
                    <div class="workout-day-header" onclick="toggleWorkoutDay(this)">
                        <div class="workout-day-title">
                            <span>${formattedDate}</span>
                            <span class="workout-day-badge">${session.day}</span>
                        </div>
                        <span style="color: var(--text-muted);">${session.exercises.length} exercices ▼</span>
                    </div>
                    <div class="workout-day-content" style="display: none;">
                        ${session.exercises.map(ex => `
                            <div class="exercise-item">
                                <span class="exercise-name">${ex.exercise}</span>
                                <span class="exercise-sets">${ex.sets} séries</span>
                                <span class="exercise-reps">${ex.achievedReps || '-'} reps</span>
                                <span class="exercise-weight">${ex.weight}kg</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }).join('');
}

// Calculer les statistiques de progression
function getProgressionStats(exerciseName) {
    const logs = state.progressLog[exerciseName];
    if (!logs || logs.length < 2) return null;

    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];
    
    const weightProgress = lastLog.weight - firstLog.weight;
    const percentProgress = ((lastLog.weight - firstLog.weight) / firstLog.weight * 100).toFixed(1);
    
    return {
        totalSessions: logs.length,
        startWeight: firstLog.weight,
        currentWeight: lastLog.weight,
        weightProgress,
        percentProgress,
        averageReps: Math.round(logs.reduce((sum, l) => sum + (l.achievedReps || 0), 0) / logs.length)
    };
}
