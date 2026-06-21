document.addEventListener('DOMContentLoaded', function () {

    // ── Data from localStorage (saved even after page refresh) ──
    let transactions = JSON.parse(localStorage.getItem('smartTrackerData')) || [];
    let expenseChartInstance = null;
    let cashFlowChartInstance = null;

    // ── User settings with defaults ──
    const defaultSettings = { budget: 30000, currency: '₹', theme: 'system' };
    let userSettings = JSON.parse(localStorage.getItem('smartTrackerSettings')) || defaultSettings;

    // ── DOM Elements ──
    const modal            = document.getElementById('transactionModal');
    const openBtn          = document.getElementById('openModalBtn');
    const closeBtn         = document.getElementById('closeModalBtn');
    const form             = document.getElementById('transactionForm');
    const transactionListEl = document.querySelector('.transaction-list');

    const totalIncomeEl  = document.querySelectorAll('.summary-card h3')[0];
    const totalExpenseEl = document.querySelectorAll('.summary-card h3')[1];
    const balanceEl      = document.querySelectorAll('.summary-card h3')[2];
    const txCountEl      = document.querySelectorAll('.summary-card h3')[3];

    const budgetAmountText  = document.getElementById('budgetAmountText');
    const budgetProgressFill = document.getElementById('budgetProgressFill');
    const budgetProgressText = document.getElementById('budgetProgressText');
    const chartTotalExpenseEl = document.querySelector('.total-expenses-footer strong');

    const darkModeToggle = document.getElementById('darkModeCheckbox');
    const clearDataBtn   = document.getElementById('clearDataBtn');

    // Views
    const dashboardView    = document.getElementById('dashboardView');
    const transactionsView = document.getElementById('transactionsView');
    const categoriesView   = document.getElementById('categoriesView');
    const analyticsView    = document.getElementById('analyticsView');
    const settingsView     = document.getElementById('settingsView');

    // Nav links
    const navDashboard    = document.getElementById('navDashboard');
    const navTransactions = document.getElementById('navTransactions');
    const navCategories   = document.getElementById('navCategories');
    const navAnalytics    = document.getElementById('navAnalytics');
    const navSettings     = document.getElementById('navSettings');

    const viewAllBtn             = document.getElementById('viewAllBtn');
    const allTransactionsListEl  = document.getElementById('allTransactionsList');
    const categoryBreakdownListEl = document.getElementById('categoryBreakdownList');
    const headerTitle    = document.getElementById('pageTitle');
    const headerSubtitle = document.getElementById('pageSubtitle');

    // Mobile menu
    const menuToggle     = document.getElementById('menuToggle');
    const sidebar        = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Settings inputs
    const settingBudget   = document.getElementById('settingBudget');
    const settingCurrency = document.getElementById('settingCurrency');
    const settingTheme    = document.getElementById('settingTheme');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const modalAmountLabel = document.getElementById('modalAmountLabel');


    // ── THEME ──────────────────────────────────────────────────
    function applyTheme(pref) {
        let isDark = pref === 'dark';
        if (pref === 'system') {
            isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        document.body.classList.toggle('dark-theme', isDark);
        if (darkModeToggle) darkModeToggle.checked = isDark;
    }

    applyTheme(userSettings.theme);

    // Fill settings form with saved values
    if (settingBudget)   settingBudget.value   = userSettings.budget;
    if (settingCurrency) settingCurrency.value = userSettings.currency;
    if (settingTheme)    settingTheme.value    = userSettings.theme;
    if (modalAmountLabel) modalAmountLabel.innerText = `Amount (${userSettings.currency})`;

    // Dark mode toggle in header
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            userSettings.theme = darkModeToggle.checked ? 'dark' : 'light';
            localStorage.setItem('smartTrackerSettings', JSON.stringify(userSettings));
            applyTheme(userSettings.theme);
            if (settingTheme) settingTheme.value = userSettings.theme;
        });
    }

    // Save settings button
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            userSettings.budget   = parseFloat(settingBudget.value) || 30000;
            userSettings.currency = settingCurrency.value;
            userSettings.theme    = settingTheme.value;

            localStorage.setItem('smartTrackerSettings', JSON.stringify(userSettings));
            applyTheme(userSettings.theme);

            if (modalAmountLabel) modalAmountLabel.innerText = `Amount (${userSettings.currency})`;

            updateDashboard();
            renderCategoryView();
            alert('Settings saved!');
        });
    }


    // ── VIEW SWITCHING ─────────────────────────────────────────
    function switchView(view) {
        // Hide all views
        [dashboardView, transactionsView, categoriesView, analyticsView, settingsView]
            .forEach(v => { if (v) v.style.display = 'none'; });

        // Remove active class from all nav links
        [navDashboard, navTransactions, navCategories, navAnalytics, navSettings]
            .forEach(n => { if (n) n.classList.remove('active'); });

        const titles = {
            dashboard:    ['Dashboard',        'Overview of your finances'],
            transactions: ['All Transactions', 'Complete history of your income and expenses'],
            categories:   ['Categories',       'See exactly where your money goes'],
            analytics:    ['Analytics',        'Deep dive into your financial habits'],
            settings:     ['Settings',         'Manage your preferences'],
        };

        if (headerTitle)    headerTitle.innerText    = titles[view][0];
        if (headerSubtitle) headerSubtitle.innerText = titles[view][1];

        if (view === 'dashboard') {
            dashboardView.style.display = 'flex';
            navDashboard.classList.add('active');
        } else if (view === 'transactions') {
            transactionsView.style.display = 'flex';
            navTransactions.classList.add('active');
            renderAllTransactions();
        } else if (view === 'categories') {
            categoriesView.style.display = 'flex';
            navCategories.classList.add('active');
            renderCategoryView();
        } else if (view === 'analytics') {
            analyticsView.style.display = 'flex';
            navAnalytics.classList.add('active');
            renderAnalytics();
        } else if (view === 'settings') {
            settingsView.style.display = 'flex';
            navSettings.classList.add('active');
        }
    }

    // Attach nav clicks
    if (navDashboard)    navDashboard.addEventListener('click',    e => { e.preventDefault(); switchView('dashboard'); });
    if (navTransactions) navTransactions.addEventListener('click', e => { e.preventDefault(); switchView('transactions'); });
    if (navCategories)   navCategories.addEventListener('click',   e => { e.preventDefault(); switchView('categories'); });
    if (navAnalytics)    navAnalytics.addEventListener('click',    e => { e.preventDefault(); switchView('analytics'); });
    if (navSettings)     navSettings.addEventListener('click',     e => { e.preventDefault(); switchView('settings'); });
    if (viewAllBtn)      viewAllBtn.addEventListener('click',      e => { e.preventDefault(); switchView('transactions'); });


    // ── CLEAR ALL DATA ─────────────────────────────────────────
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if (confirm('Are you sure? This will delete all transactions.')) {
                transactions = [];
                localStorage.removeItem('smartTrackerData');
                updateDashboard();
                renderCategoryView();
            }
        });
    }


    // ── MODAL (POPUP) ──────────────────────────────────────────
    if (openBtn)  openBtn.addEventListener('click',  () => modal.style.display = 'flex');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });


    // ── MOBILE SIDEBAR ─────────────────────────────────────────
    function closeMobileMenu() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('show');
        });
    }
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileMenu);

    // Close sidebar when a nav link is clicked on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeMobileMenu();
        });
    });


    // ── ADD TRANSACTION FORM ───────────────────────────────────
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const newTx = {
                id:       Date.now(),
                title:    document.getElementById('titleInput').value,
                amount:   parseFloat(document.getElementById('amountInput').value),
                type:     document.getElementById('typeInput').value,
                category: document.getElementById('categoryInput').value,
                date:     new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            };

            transactions.unshift(newTx); // add to beginning of array
            localStorage.setItem('smartTrackerData', JSON.stringify(transactions));

            updateDashboard();
            renderCategoryView();
            form.reset();
            modal.style.display = 'none';
        });
    }


    // ── CORE: INIT & UPDATE ────────────────────────────────────
    function initDashboard() {
        renderChart();
        updateDashboard();
    }

    function updateDashboard() {
        calculateSummaries();
        renderTransactionList();
        renderAllTransactions();
        updateChartData();
        renderAnalytics();
    }


    // ── CALCULATE & DISPLAY SUMMARIES ─────────────────────────
    function calculateSummaries() {
        let income = 0, expense = 0;
        transactions.forEach(tx => {
            if (tx.type === 'income')  income  += tx.amount;
            if (tx.type === 'expense') expense += tx.amount;
        });

        const cur = userSettings.currency;
        const balance = income - expense;

        totalIncomeEl.innerText  = `${cur}${income.toLocaleString('en-IN')}`;
        totalExpenseEl.innerText = `${cur}${expense.toLocaleString('en-IN')}`;
        balanceEl.innerText      = `${cur}${balance.toLocaleString('en-IN')}`;
        txCountEl.innerText      = transactions.length;
        if (chartTotalExpenseEl) chartTotalExpenseEl.innerText = `${cur}${expense.toLocaleString('en-IN')}`;

        // Budget progress bar
        const budget = userSettings.budget;
        const pct = Math.min(Math.round((expense / budget) * 100), 100);

        if (budgetAmountText)   budgetAmountText.innerText       = `${cur}${expense.toLocaleString('en-IN')} / ${cur}${budget.toLocaleString('en-IN')}`;
        if (budgetProgressFill) budgetProgressFill.style.width   = `${pct}%`;
        if (budgetProgressText) budgetProgressText.innerText     = `${pct}%`;
    }


    // ── ICON HELPER ────────────────────────────────────────────
    function getCategoryIcon(category) {
        const map = {
            Food:          { icon: 'fa-solid fa-utensils',     bg: 'bg-green-light',  color: 'text-green'  },
            Transport:     { icon: 'fa-solid fa-bus',          bg: 'bg-blue-light',   color: 'text-blue'   },
            Income:        { icon: 'fa-solid fa-briefcase',    bg: 'bg-green-light',  color: 'text-green'  },
            Shopping:      { icon: 'fa-solid fa-bag-shopping', bg: 'bg-yellow-light', color: 'text-yellow' },
            Entertainment: { icon: 'fa-solid fa-film',         bg: 'bg-red-light',    color: 'text-red'    },
        };
        return map[category] || { icon: 'fa-solid fa-receipt', bg: 'bg-yellow-light', color: 'text-yellow' };
    }

    // Builds a single transaction row HTML
    function buildTxHTML(tx) {
        const cur      = userSettings.currency;
        const isIncome = tx.type === 'income';
        const sign     = isIncome ? '+' : '-';
        const colorClass = isIncome ? 'text-green' : 'text-red';
        const { icon, bg, color } = getCategoryIcon(tx.category);

        return `
            <div class="transaction-item">
                <div class="t-left">
                    <div class="t-icon ${bg}"><i class="${icon} ${color}"></i></div>
                    <div>
                        <h4>${tx.title}</h4>
                        <p>${tx.category}</p>
                    </div>
                </div>
                <div class="t-right ${colorClass}">
                    <h4>${sign} ${cur}${tx.amount.toLocaleString('en-IN')}</h4>
                    <p>${tx.date}</p>
                </div>
            </div>
        `;
    }


    // ── RENDER RECENT (dashboard, shows last 5) ────────────────
    function renderTransactionList() {
        if (!transactionListEl) return;
        transactionListEl.innerHTML = '';
        transactions.slice(0, 5).forEach(tx => {
            transactionListEl.insertAdjacentHTML('beforeend', buildTxHTML(tx));
        });
    }

    // ── RENDER ALL (transactions page) ────────────────────────
    function renderAllTransactions() {
        if (!allTransactionsListEl) return;
        allTransactionsListEl.innerHTML = '';

        if (transactions.length === 0) {
            allTransactionsListEl.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;">No transactions yet.</p>';
            return;
        }
        transactions.forEach(tx => allTransactionsListEl.insertAdjacentHTML('beforeend', buildTxHTML(tx)));
    }


    // ── CATEGORY VIEW ──────────────────────────────────────────
    function getCategoryTotals() {
        let totals = { Food: 0, Transport: 0, Shopping: 0, Entertainment: 0, Others: 0 };
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                totals[tx.category] !== undefined ? totals[tx.category] += tx.amount : totals.Others += tx.amount;
            }
        });
        return totals;
    }

    function renderCategoryView() {
        if (!categoryBreakdownListEl) return;
        categoryBreakdownListEl.innerHTML = '';

        const totals = getCategoryTotals();
        const totalExpense = Object.values(totals).reduce((a, b) => a + b, 0);
        const cur = userSettings.currency;

        if (totalExpense === 0) {
            categoryBreakdownListEl.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No expenses yet.</p>';
            return;
        }

        const colors = { Food: '#22c55e', Transport: '#3b82f6', Shopping: '#eab308', Entertainment: '#ef4444', Others: '#a855f7' };

        for (const [category, amount] of Object.entries(totals)) {
            if (amount <= 0) continue;
            const pct = Math.round((amount / totalExpense) * 100);
            categoryBreakdownListEl.insertAdjacentHTML('beforeend', `
                <div style="margin-bottom:24px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong style="color:var(--text-main);">${category}</strong>
                        <span style="color:var(--text-muted); font-weight:500;">${cur}${amount.toLocaleString('en-IN')} (${pct}%)</span>
                    </div>
                    <div style="background:#e2e8f0; border-radius:10px; height:12px; overflow:hidden;">
                        <div style="background:${colors[category] || '#a855f7'}; height:100%; width:${pct}%; transition:width 0.5s ease;"></div>
                    </div>
                </div>
            `);
        }
    }


    // ── DOUGHNUT CHART (dashboard) ─────────────────────────────
    function getChartData() {
        const totals = getCategoryTotals();
        return {
            labels: Object.keys(totals),
            datasets: [{
                data: Object.values(totals),
                backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7'],
                borderWidth: 0
            }]
        };
    }

    function renderChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: getChartData(),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { usePointStyle: true, padding: 25, font: { family: "'Inter', sans-serif", size: 14, weight: '500' } }
                    }
                }
            }
        });
    }

    function updateChartData() {
        if (expenseChartInstance) {
            expenseChartInstance.data = getChartData();
            expenseChartInstance.update();
        }
    }


    // ── ANALYTICS PAGE ─────────────────────────────────────────
    function renderAnalytics() {
        if (!document.getElementById('cashFlowChart')) return;

        let income = 0, expense = 0;
        const cur = userSettings.currency;
        transactions.forEach(tx => {
            if (tx.type === 'income')  income  += tx.amount;
            if (tx.type === 'expense') expense += tx.amount;
        });

        // Net savings
        const netSavings = income - expense;
        const savingsEl = document.getElementById('analyticsNetSavings');
        if (savingsEl) {
            savingsEl.innerText = `${cur}${netSavings.toLocaleString('en-IN')}`;
            savingsEl.style.color = netSavings >= 0 ? '#22c55e' : '#ef4444';
        }

        // Top spending category
        const totals = getCategoryTotals();
        let topCat = '-', maxSpend = 0;
        for (const [cat, amt] of Object.entries(totals)) {
            if (amt > maxSpend) { maxSpend = amt; topCat = cat; }
        }
        const topCatEl = document.getElementById('analyticsTopCategory');
        if (topCatEl) topCatEl.innerText = topCat;

        // Bar chart
        const ctx = document.getElementById('cashFlowChart').getContext('2d');
        if (cashFlowChartInstance) {
            cashFlowChartInstance.data.datasets[0].data = [income, expense];
            cashFlowChartInstance.update();
        } else {
            cashFlowChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Total Income', 'Total Expense'],
                    datasets: [{
                        label: 'Amount',
                        data: [income, expense],
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }


    // ── START THE APP ──────────────────────────────────────────
    initDashboard();

});
