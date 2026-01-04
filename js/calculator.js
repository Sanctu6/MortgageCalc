/**
 * Mortgage Calculator Application
 * Calculates mortgage payments and amortization schedule for Ukrainian market
 * Supports both UAH and USD currencies with exchange rate conversion
 */

const MortgageCalculator = (() => {
    // ========== Constants ==========
    const CONFIG = {
        DEFAULT_CURRENCY: 'UAH',
        DEFAULT_MODE: 'payment',
        DEFAULT_EXCHANGE_RATE: 40,
        MAX_MONTHS: 600, // 50 years safety limit
        EPSILON: 0.0001, // For floating-point comparison
        PFU_RATE: 0.01, // 1% pension fund fee
        MONTHS_PER_YEAR: 12,
    };

    const LOCALE_CONFIG = {
        'uk-UA': { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 },
        'en-US': { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
    };

    // ========== State Management ==========
    let state = {
        storedCurrency: CONFIG.DEFAULT_CURRENCY,
        downPaymentManual: false,
        comfortPaymentInitialized: false,
    };

    // ========== DOM Element Caching ==========
    const DOM = {
        // Input elements
        mode: null,
        currency: null,
        exchangeRate: null,
        price: null,
        downPayment: null,
        rate: null,
        years: null,
        targetPayment: null,
        pfuCheck: null,
        insuranceRate: null,
        oneTimeFees: null,

        // UI elements
        usdRateInput: null,
        termInputGroup: null,
        paymentInputGroup: null,
        calculateBtn: null,
        downPaymentPercent: null,

        // Unit labels
        unitPrice: null,
        unitDown: null,
        unitTarget: null,
        unitFees: null,

        // Results
        resPayment: null,
        resTerm: null,
        resOverpay: null,
        resStartCosts: null,
        scheduleBody: null,

        init() {
            // Input elements
            this.mode = document.getElementById('mode');
            this.currency = document.getElementById('currency');
            this.exchangeRate = document.getElementById('exchangeRate');
            this.price = document.getElementById('price');
            this.downPayment = document.getElementById('downPayment');
            this.rate = document.getElementById('rate');
            this.years = document.getElementById('years');
            this.targetPayment = document.getElementById('targetPayment');
            this.pfuCheck = document.getElementById('pfuCheck');
            this.insuranceRate = document.getElementById('insuranceRate');
            this.oneTimeFees = document.getElementById('oneTimeFees');

            // UI elements
            this.usdRateInput = document.getElementById('usdRateInput');
            this.termInputGroup = document.getElementById('termInputGroup');
            this.paymentInputGroup = document.getElementById('paymentInputGroup');
            this.calculateBtn = document.getElementById('calculateBtn');
            this.downPaymentPercent = document.getElementById('downPaymentPercent');

            // Unit labels
            this.unitPrice = document.getElementById('unitPrice');
            this.unitDown = document.getElementById('unitDown');
            this.unitTarget = document.getElementById('unitTarget');
            this.unitFees = document.getElementById('unitFees');

            // Results
            this.resPayment = document.getElementById('resPayment');
            this.resTerm = document.getElementById('resTerm');
            this.resOverpay = document.getElementById('resOverpay');
            this.resStartCosts = document.getElementById('resStartCosts');
            this.scheduleBody = document.getElementById('scheduleBody');
        },
    };

    // ========== Event Listeners ==========
    const setupEventListeners = () => {
        DOM.mode.addEventListener('change', handleModeChange);
        DOM.currency.addEventListener('change', handleCurrencyChange);
        DOM.price.addEventListener('input', handlePriceInput);
        DOM.downPayment.addEventListener('input', handleDownPaymentInput);
        DOM.exchangeRate.addEventListener('change', calculate);
        DOM.calculateBtn.addEventListener('click', calculate);

        // Also calculate on any parameter change
        [DOM.rate, DOM.years, DOM.targetPayment, DOM.pfuCheck, DOM.insuranceRate, DOM.oneTimeFees]
            .forEach(el => {
                if (el.type === 'checkbox') {
                    el.addEventListener('change', calculate);
                } else {
                    el.addEventListener('input', calculate);
                }
            });
    };

    // ========== Event Handlers ==========
    const handleModeChange = () => {
        const mode = DOM.mode.value;
        if (mode === 'term') {
            DOM.termInputGroup.classList.remove('hidden');
            DOM.paymentInputGroup.classList.add('hidden');
        } else {
            DOM.termInputGroup.classList.add('hidden');
            DOM.paymentInputGroup.classList.remove('hidden');
        }
        calculate();
    };

    const handlePriceInput = () => {
        const price = parseFloat(DOM.price.value) || 0;
        if (!state.downPaymentManual) {
            DOM.downPayment.value = Math.round(price * 0.2);
        }
        calculate();
    };

    const handleDownPaymentInput = () => {
        state.downPaymentManual = true;
        calculate();
    };

    const handleCurrencyChange = () => {
        const currentCurrency = DOM.currency.value;
        const previousCurrency = state.storedCurrency;
        const exchangeRate = parseFloat(DOM.exchangeRate.value) || 1;

        // Convert input values when switching currency
        if (previousCurrency !== currentCurrency) {
            const inputIds = ['price', 'downPayment', 'targetPayment', 'oneTimeFees'];
            inputIds.forEach(id => {
                const element = document.getElementById(id);
                if (element && element.value) {
                    const currentValue = parseFloat(element.value) || 0;
                    element.value = currentCurrency === 'USD'
                        ? Math.round(currentValue / exchangeRate)
                        : Math.round(currentValue * exchangeRate);
                }
            });
            state.storedCurrency = currentCurrency;
        }

        // Toggle exchange rate input visibility
        DOM.usdRateInput.classList.toggle('hidden', currentCurrency !== 'USD');

        // Update unit labels
        const unit = currentCurrency === 'USD' ? 'USD' : 'грн';
        DOM.unitPrice.textContent = unit;
        DOM.unitDown.textContent = unit;
        DOM.unitTarget.textContent = unit;
        DOM.unitFees.textContent = unit;

        calculate();
    };

    // ========== Formatting Functions ==========
    const formatMoney = (amount, currency) => {
        if (!isFinite(amount)) amount = 0;

        const locale = currency === 'USD' ? 'en-US' : 'uk-UA';
        const formatter = new Intl.NumberFormat(locale, LOCALE_CONFIG[locale]);
        return formatter.format(Math.round(amount));
    };

    const getCurrencyCode = () => {
        return DOM.currency.value === 'USD' ? 'USD' : 'UAH';
    };

    const convertForDisplay = (amount) => {
        const currentCurrency = DOM.currency.value;
        const previousCurrency = state.storedCurrency;
        const exchangeRate = parseFloat(DOM.exchangeRate.value) || 1;

        // No conversion needed if currencies match
        if (currentCurrency === previousCurrency) return amount;

        // Convert between currencies
        if (currentCurrency === 'USD' && previousCurrency === 'UAH') {
            return amount / exchangeRate;
        }
        if (currentCurrency === 'UAH' && previousCurrency === 'USD') {
            return amount * exchangeRate;
        }
        return amount;
    };

    // ========== Calculation Functions ==========
    const initializeComfortPayment = () => {
        if (state.comfortPaymentInitialized) return;

        const exchangeRate = parseFloat(DOM.exchangeRate.value) || 1;
        const currency = DOM.currency.value;
        const defaultPayment = 2000; // USD

        DOM.targetPayment.value = currency === 'USD'
            ? defaultPayment
            : Math.round(defaultPayment * exchangeRate);

        state.comfortPaymentInitialized = true;
    };

    const validateInputs = (loanBody, monthlyPayment, monthlyRate) => {
        const firstMonthInterest = loanBody * monthlyRate;

        if (monthlyPayment <= firstMonthInterest) {
            const formattedInterest = formatMoney(
                convertForDisplay(firstMonthInterest),
                getCurrencyCode()
            );
            alert(`Платіж занадто малий! Тільки відсотки в перший місяць складають ${formattedInterest}`);
            return false;
        }
        return true;
    };

    const calculateMonthlyPaymentAnnuity = (loanBody, monthlyRate, months) => {
        // Annuity Formula: A = P * (r * (1+r)^n) / ((1+r)^n - 1)
        const raisedTerm = Math.pow(1 + monthlyRate, months);
        return loanBody * (monthlyRate * raisedTerm) / (raisedTerm - 1);
    };

    const generateAmortizationSchedule = (
        loanBody,
        monthlyRate,
        monthlyPayment,
        mode,
        insuranceRate
    ) => {
        let balance = loanBody;
        let totalInterest = 0;
        let totalInsurance = 0;
        let scheduleRows = [];
        let currentMonth = 1;

        const scheduledPayment = monthlyPayment || 0;

        while (balance > CONFIG.EPSILON && currentMonth <= CONFIG.MAX_MONTHS) {
            const interest = balance * monthlyRate;
            const insurance = (balance * insuranceRate) / CONFIG.MONTHS_PER_YEAR;

            let paymentThisMonth = scheduledPayment;
            let principal = 0;

            // Determine principal based on mode
            if (mode === 'payment' && balance + interest < scheduledPayment) {
                // Last payment in "target payment" mode
                paymentThisMonth = balance + interest;
            }

            principal = paymentThisMonth - interest;
            if (principal > balance) principal = balance;

            balance -= principal;
            totalInterest += interest;
            totalInsurance += insurance;

            // Format values for display
            const displayValues = {
                month: currentMonth,
                payment: formatMoney(convertForDisplay(paymentThisMonth + insurance), getCurrencyCode()),
                principal: formatMoney(convertForDisplay(principal), getCurrencyCode()),
                interest: formatMoney(convertForDisplay(interest), getCurrencyCode()),
                insurance: formatMoney(convertForDisplay(insurance), getCurrencyCode()),
                balance: formatMoney(convertForDisplay(balance), getCurrencyCode()),
            };

            scheduleRows.push(displayValues);

            if (balance <= CONFIG.EPSILON) break;
            currentMonth++;
        }

        return {
            schedule: scheduleRows,
            months: currentMonth,
            totalInterest,
            totalInsurance,
        };
    };

    const renderScheduleTable = (schedule) => {
        const html = schedule
            .map(row => `
                <tr>
                    <td>${row.month}</td>
                    <td class="font-bold">${row.payment}</td>
                    <td>${row.principal}</td>
                    <td class="text-red-600">${row.interest}</td>
                    <td class="text-gray-500">${row.insurance}</td>
                    <td>${row.balance}</td>
                </tr>
            `)
            .join('');

        DOM.scheduleBody.innerHTML = html;
    };

    const renderResults = (monthlyPayment, months, totalOverpay, totalStartCosts, loanBody, insuranceRate, currency) => {
        // Monthly payment with insurance
        const firstMonthInsurance = (loanBody * insuranceRate) / CONFIG.MONTHS_PER_YEAR;
        const displayPayment = convertForDisplay(monthlyPayment);
        const displayInsurance = convertForDisplay(firstMonthInsurance);

        DOM.resPayment.textContent = `${formatMoney(displayPayment, currency)} (страх.: ${formatMoney(displayInsurance, currency)})`;

        // Term
        const years = Math.floor(months / CONFIG.MONTHS_PER_YEAR);
        const remainingMonths = months % CONFIG.MONTHS_PER_YEAR;
        DOM.resTerm.textContent = `${years} р. ${remainingMonths} міс.`;

        // Overpayment
        DOM.resOverpay.textContent = formatMoney(convertForDisplay(totalOverpay), currency);

        // Start costs
        DOM.resStartCosts.textContent = formatMoney(convertForDisplay(totalStartCosts), currency);
    };

    // ========== Main Calculation Logic ==========
    const calculate = () => {
        // Collect inputs
        const price = parseFloat(DOM.price.value) || 0;
        const downPayment = parseFloat(DOM.downPayment.value) || 0;
        const ratePercent = parseFloat(DOM.rate.value) || 0;
        const mode = DOM.mode.value;
        const insuranceRate = (parseFloat(DOM.insuranceRate.value) || 0) / 100;
        const oneTimeFees = parseFloat(DOM.oneTimeFees.value) || 0;
        const hasPFU = DOM.pfuCheck.checked;
        const currency = getCurrencyCode();

        // Validate
        if (downPayment >= price) {
            alert('Перший внесок більший за ціну!');
            return;
        }

        // Calculate loan parameters
        const loanBody = price - downPayment;
        const monthlyRate = ratePercent / 12 / 100;

        // Display down payment percentage
        const downPaymentPercent = (downPayment / price) * 100;
        DOM.downPaymentPercent.textContent = `(${downPaymentPercent.toFixed(1)}% від ціни)`;

        // Calculate monthly payment
        let monthlyPayment = 0;
        let months = 0;

        if (mode === 'term') {
            const years = parseFloat(DOM.years.value) || 0;
            months = years * CONFIG.MONTHS_PER_YEAR;
            monthlyPayment = calculateMonthlyPaymentAnnuity(loanBody, monthlyRate, months);
        } else {
            monthlyPayment = parseFloat(DOM.targetPayment.value) || 0;
            if (!validateInputs(loanBody, monthlyPayment, monthlyRate)) {
                return;
            }
        }

        // Generate amortization schedule
        const result = generateAmortizationSchedule(
            loanBody,
            monthlyRate,
            monthlyPayment,
            mode,
            insuranceRate
        );

        if (mode === 'payment') {
            months = result.months;
        }

        // Render table
        renderScheduleTable(result.schedule);

        // Calculate totals
        const pfuCost = hasPFU ? price * CONFIG.PFU_RATE : 0;
        const totalStartCosts = downPayment + pfuCost + oneTimeFees;
        const totalOverpay = result.totalInterest + result.totalInsurance;

        // Render results
        renderResults(
            monthlyPayment,
            months,
            totalOverpay,
            totalStartCosts,
            loanBody,
            insuranceRate,
            currency
        );
    };

    // ========== Initialization ==========
    const init = () => {
        DOM.init();
        setupEventListeners();
        initializeComfortPayment();
        handleModeChange();
        handleCurrencyChange();
        calculate();
    };

    // Public API
    return {
        init,
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', MortgageCalculator.init);
