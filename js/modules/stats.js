// ==================== STATS MODULE ====================

// Chart instances
let weightTrendChart = null;
let caloriesTrendChart = null;
let macrosAvgChart = null;

// Période sélectionnée
let statsPeriod = 7; // jours (défaut: 7)

// ==================== DATA AGGREGATION ====================

/**
 * Récupère les données du journal pour une période
 */
function getJournalDataForPeriod(days) {
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = state.journal?.[dateStr] || [];
        
        // Calculer les totaux du jour
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        
        dayData.forEach(entry => {
            const food = state.foods?.find(f => f.id === entry.foodId);
            if (food && entry.quantity) {
                const ratio = entry.quantity / 100;
                calories += Math.round(food.calories * ratio);
                protein += Math.round(food.protein * ratio);
                carbs += Math.round(food.carbs * ratio);
                fat += Math.round(food.fat * ratio);
            }
        });
        
        data.push({
            date: dateStr,
            label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            calories,
            protein,
            carbs,
            fat,
            hasData: dayData.length > 0
        });
    }
    
    return data;
}

/**
 * Récupère les données de poids pour une période
 */
function getWeightDataForPeriod(days) {
    const data = [];
    const today = new Date();
    const weights = state.bodyweightHistory || [];
    
    // Créer un map date -> poids
    const weightMap = {};
    weights.forEach(w => {
        weightMap[w.date] = w.weight;
    });
    
    let lastWeight = state.profile?.weight || null;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        if (weightMap[dateStr]) {
            lastWeight = weightMap[dateStr];
        }
        
        data.push({
            date: dateStr,
            label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            weight: weightMap[dateStr] || null,
            interpolated: lastWeight
        });
    }
    
    return data;
}

/**
 * Calcule les statistiques résumées
 */
function calculateSummaryStats(journalData, weightData) {
    // Filtrer les jours avec des données
    const daysWithData = journalData.filter(d => d.hasData);
    
    if (daysWithData.length === 0) {
        return {
            avgCalories: 0,
            avgProtein: 0,
            avgCarbs: 0,
            avgFat: 0,
            totalDaysLogged: 0,
            consistency: 0,
            weightChange: null,
            caloriesVsGoal: 0
        };
    }
    
    // Moyennes
    const avgCalories = Math.round(daysWithData.reduce((sum, d) => sum + d.calories, 0) / daysWithData.length);
    const avgProtein = Math.round(daysWithData.reduce((sum, d) => sum + d.protein, 0) / daysWithData.length);
    const avgCarbs = Math.round(daysWithData.reduce((sum, d) => sum + d.carbs, 0) / daysWithData.length);
    const avgFat = Math.round(daysWithData.reduce((sum, d) => sum + d.fat, 0) / daysWithData.length);
    
    // Consistency (% de jours loggés)
    const consistency = Math.round((daysWithData.length / journalData.length) * 100);
    
    // Changement de poids
    const weightsWithData = weightData.filter(d => d.weight !== null);
    let weightChange = null;
    if (weightsWithData.length >= 2) {
        const firstWeight = weightsWithData[0].weight;
        const lastWeight = weightsWithData[weightsWithData.length - 1].weight;
        weightChange = lastWeight - firstWeight;
    }
    
    // Calories vs objectif
    const targetCalories = state.profile?.calories || 2000;
    const caloriesVsGoal = avgCalories - targetCalories;
    
    return {
        avgCalories,
        avgProtein,
        avgCarbs,
        avgFat,
        totalDaysLogged: daysWithData.length,
        consistency,
        weightChange,
        caloriesVsGoal
    };
}

// ==================== CHART RENDERING ====================

/**
 * Crée/met à jour le graphique d'évolution du poids
 */
function renderWeightTrendChart(weightData) {
    const ctx = document.getElementById('weight-trend-chart');
    if (!ctx) return;
    
    // Filtrer pour n'avoir que les points avec des données réelles
    const labels = weightData.map(d => d.label);
    const weights = weightData.map(d => d.weight);
    const interpolated = weightData.map(d => d.interpolated);
    
    if (weightTrendChart) {
        weightTrendChart.destroy();
    }
    
    weightTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Poids (kg)',
                    data: weights,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#00ff88',
                    tension: 0.3,
                    fill: true,
                    spanGaps: true
                },
                {
                    label: 'Tendance',
                    data: interpolated,
                    borderColor: 'rgba(0, 255, 136, 0.3)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            if (context.parsed.y !== null) {
                                return `${context.parsed.y} kg`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { 
                        color: '#888',
                        maxTicksLimit: 7
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' }
                }
            }
        }
    });
}

/**
 * Crée/met à jour le graphique des calories
 */
function renderCaloriesTrendChart(journalData) {
    const ctx = document.getElementById('calories-trend-chart');
    if (!ctx) return;
    
    const targetCalories = state.profile?.calories || 2000;
    
    if (caloriesTrendChart) {
        caloriesTrendChart.destroy();
    }
    
    caloriesTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: journalData.map(d => d.label),
            datasets: [
                {
                    label: 'Calories',
                    data: journalData.map(d => d.hasData ? d.calories : null),
                    backgroundColor: journalData.map(d => {
                        if (!d.hasData) return 'rgba(100, 100, 100, 0.2)';
                        if (d.calories > targetCalories * 1.1) return 'rgba(255, 99, 132, 0.7)';
                        if (d.calories < targetCalories * 0.9) return 'rgba(255, 206, 86, 0.7)';
                        return 'rgba(0, 255, 136, 0.7)';
                    }),
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations: {
                        targetLine: {
                            type: 'line',
                            yMin: targetCalories,
                            yMax: targetCalories,
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            borderWidth: 2,
                            borderDash: [5, 5]
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: '#888',
                        maxTicksLimit: 7
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Ajouter ligne d'objectif manuellement (sans plugin annotation)
    addTargetLine(caloriesTrendChart, targetCalories);
}

/**
 * Ajoute une ligne d'objectif sur un chart
 */
function addTargetLine(chart, targetValue) {
    const originalDraw = chart.draw;
    chart.draw = function() {
        originalDraw.apply(this, arguments);
        
        const ctx = this.ctx;
        const yAxis = this.scales.y;
        const xAxis = this.scales.x;
        
        const y = yAxis.getPixelForValue(targetValue);
        
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(xAxis.left, y);
        ctx.lineTo(xAxis.right, y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        
        // Label
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px Inter';
        ctx.fillText(`Objectif: ${targetValue}`, xAxis.right - 80, y - 5);
        ctx.restore();
    };
    chart.draw();
}

/**
 * Crée/met à jour le graphique de répartition des macros
 */
function renderMacrosAvgChart(stats) {
    const ctx = document.getElementById('macros-avg-chart');
    if (!ctx) return;
    
    if (macrosAvgChart) {
        macrosAvgChart.destroy();
    }
    
    const total = stats.avgProtein * 4 + stats.avgCarbs * 4 + stats.avgFat * 9;
    
    macrosAvgChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protéines', 'Glucides', 'Lipides'],
            datasets: [{
                data: [
                    stats.avgProtein * 4,
                    stats.avgCarbs * 4,
                    stats.avgFat * 9
                ],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(234, 179, 8, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#888',
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${context.label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
}

// ==================== UI RENDERING ====================

/**
 * Affiche les statistiques résumées
 */
function renderSummaryStats(stats) {
    const container = document.getElementById('stats-summary');
    if (!container) return;
    
    const targetCalories = state.profile?.calories || 2000;
    const targetProtein = state.profile?.protein || 150;
    
    const weightChangeText = stats.weightChange !== null 
        ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange.toFixed(1)} kg`
        : '-';
    
    const weightChangeClass = stats.weightChange !== null
        ? (stats.weightChange < 0 ? 'positive' : stats.weightChange > 0 ? 'negative' : '')
        : '';
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-box-icon">🔥</div>
                <div class="stat-box-value">${stats.avgCalories}</div>
                <div class="stat-box-label">Calories/jour</div>
                <div class="stat-box-sub ${stats.caloriesVsGoal > 0 ? 'over' : 'under'}">
                    ${stats.caloriesVsGoal > 0 ? '+' : ''}${stats.caloriesVsGoal} vs objectif
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-box-icon">🥩</div>
                <div class="stat-box-value">${stats.avgProtein}g</div>
                <div class="stat-box-label">Protéines/jour</div>
                <div class="stat-box-sub">${Math.round((stats.avgProtein / targetProtein) * 100)}% objectif</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-icon">⚖️</div>
                <div class="stat-box-value ${weightChangeClass}">${weightChangeText}</div>
                <div class="stat-box-label">Évolution poids</div>
                <div class="stat-box-sub">sur ${statsPeriod} jours</div>
            </div>
            <div class="stat-box">
                <div class="stat-box-icon">📅</div>
                <div class="stat-box-value">${stats.consistency}%</div>
                <div class="stat-box-label">Régularité</div>
                <div class="stat-box-sub">${stats.totalDaysLogged}/${statsPeriod} jours loggés</div>
            </div>
        </div>
    `;
}

/**
 * Change la période des statistiques
 */
function setStatsPeriod(days) {
    statsPeriod = days;
    
    // Update boutons actifs
    document.querySelectorAll('.stats-period-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.period) === days);
    });
    
    // Recharger les stats
    loadStatsData();
}

/**
 * Charge et affiche toutes les données stats
 */
function loadStatsData() {
    const journalData = getJournalDataForPeriod(statsPeriod);
    const weightData = getWeightDataForPeriod(statsPeriod);
    const stats = calculateSummaryStats(journalData, weightData);
    
    renderSummaryStats(stats);
    renderWeightTrendChart(weightData);
    renderCaloriesTrendChart(journalData);
    renderMacrosAvgChart(stats);
}

/**
 * Initialise le module stats
 */
function initStatsModule() {
    loadStatsData();
}

/**
 * Change d'onglet dans la section Progress
 */
function switchProgressTab(tabName) {
    // Cacher tous les contenus
    document.querySelectorAll('#progress .tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Désactiver tous les onglets
    document.querySelectorAll('#progress .tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Afficher le contenu sélectionné
    const content = document.getElementById(`tab-${tabName}`);
    if (content) content.style.display = 'block';

    // Activer l'onglet
    const tab = document.querySelector(`#progress .tab[data-tab="${tabName}"]`);
    if (tab) tab.classList.add('active');

    // Charger les données si nécessaire
    if (tabName === 'stats') {
        loadStatsData();
    } else if (tabName === 'photos' && typeof renderPhotosGallery === 'function') {
        renderPhotosGallery();
    } else if (tabName === 'prs' && typeof renderPRsSection === 'function') {
        renderPRsSection();
    }
}
