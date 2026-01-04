# Архітектура та розробка

## Огляд

Іпотечний калькулятор побудований як односторінковий застосунок (SPA) із використанням ванільного JavaScript без зовнішніх фреймворків.

## Структура модуля

### IIFE Pattern

Весь код якоря обернутий у Immediately Invoked Function Expression для створення ізольованого namespace:

```javascript
const MortgageCalculator = (() => {
    // приватне контекст
    const CONFIG = { /* ... */ };
    const DOM = { /* ... */ };
    
    // приватні функції
    const calculate = () => { /* ... */ };
    
    // публічний API
    return {
        init,
    };
})();
```

Це запобігає забруднюванню глобального простору імен та конфліктам змінних.

## Компоненти

### 1. Constants (CONFIG)

Централізовані налаштування застосунку:

```javascript
CONFIG = {
    DEFAULT_CURRENCY: 'UAH',        // Валюта за замовчуванням
    MAX_MONTHS: 600,                // Безпека: 50 років
    EPSILON: 0.0001,                // Точність для float
    PFU_RATE: 0.01,                 // Пенсійний фонд 1%
    MONTHS_PER_YEAR: 12,            // Місяців на рік
};
```

### 2. State Management

Локальний стан для відслідження стану між операціями:

```javascript
state = {
    storedCurrency: 'UAH',          // Попередня валюта для конвертації
    downPaymentManual: false,       // Чи користувач вручну змінив першого внеску
    comfortPaymentInitialized: false, // Чи встановлено комфортний платіж
};
```

Це розраховує на модульну дизайну без глобальних змінних.

### 3. DOM Caching

Кеш посилань на часто використовувані DOM елементи:

```javascript
const DOM = {
    mode: null,
    currency: null,
    // ... інші елементи
    
    init() {
        this.mode = document.getElementById('mode');
        // ... ініціалізація елементів
    }
};
```

**Переваги:**
- Зменшує кількість DOM запитів
- Підвищує продуктивність
- Централізує посилання на елементи

### 4. Event System

Все обробники подій реєструються в одному місці:

```javascript
const setupEventListeners = () => {
    DOM.mode.addEventListener('change', handleModeChange);
    DOM.currency.addEventListener('change', handleCurrencyChange);
    // ...
};
```

**Переваги:**
- Легко налагоджувати
- Нема inline обробників в HTML
- Централізована керування подіями

### 5. Calculation Engine

Розділення на окремі функції для розрахунків:

#### `calculateMonthlyPaymentAnnuity()`
Розраховує щомісячний платіж по ануїтетній формулі.

#### `generateAmortizationSchedule()`
Генерує повний графік амортизації з обліком страховки та змінюючогося залишку.

#### `validateInputs()`
Перевіряє коректність даних перед розрахунками.

## Data Flow

```
User Input (DOM)
    ↓
Event Listener
    ↓
Event Handler
    ↓
Validation
    ↓
Calculation Functions
    ↓
Render Functions
    ↓
DOM Updates (Results)
```

## Ключові функції

### Форматування

```javascript
formatMoney(amount, currency)
```
- Форматує число у вуд відповідної валюти
- Використовує Intl.NumberFormat для локалізації
- Обробляє край-кейси (Infinity, NaN)

### Конвертація валют

```javascript
convertForDisplay(amount)
```
- Конвертує суму при переключенні валют
- Використовує курс обміну з інпуту
- Зберігає оригінальні дані у старій валюті

## Обробка помилок

1. **Валідація вводу**: перевірка що перший внесок менший за ціну
2. **Валідація платежу**: перевірка що платіж покриває щонайменше відсотки
3. **Безпека циклу**: MAX_MONTHS запобігає нескінченним циклам
4. **Численна стійкість**: EPSILON уникає проблем з точністю float

## Оптимізація продуктивності

1. **DOM Caching**: один раз при ініціалізації
2. **Event Delegation**: використання слухачів натомість inline обробників
3. **Ефективний rendering**: HTML будується через масив та join()
4. **Мінімізація recalc**: calculate() викликається тільки при змінах

## Тестування

Для тестування можна використовувати:

```javascript
// Ручне тестування в console:
MortgageCalculator.init(); // Переініціалізація

// Зміна значень:
document.getElementById('price').value = 5000000;
document.getElementById('price').dispatchEvent(new Event('input'));
```

## Розширення

Щоб додати нові функції:

1. Додайте константи в CONFIG
2. Додайте DOM елементи в DOM об'єкт
3. Додайте обробник подій в setupEventListeners()
4. Додайте логіку в calculate() або окрему функцію
5. Додайте rendering в renderResults()

## Сумісність браузерів

Потребує підтримки:
- ES6 (Arrow functions, const/let, Template literals)
- Intl API (для форматування валют)
- DOM Level 3 Events

Підтримуються:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Майбутні поліпшення

- [ ] Експорт графіка у PDF
- [ ] Збереження сценаріїв у localStorage
- [ ] Порівняння різних сценаріїв
- [ ] Темний режим
- [ ] Графіки та діаграми
- [ ] Поддержка більше видів іпотек
