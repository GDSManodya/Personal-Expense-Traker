
"use strict";

// HTML elements
const transactionForm = document.getElementById("transactionForm");
const transactionTypeInput = document.getElementById("transactionType");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const transactionDateInput = document.getElementById("transactionDate");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpensesElement = document.getElementById("totalExpenses");
const currentBalanceElement = document.getElementById("currentBalance");

const transactionTableBody = document.getElementById("transactionTableBody");
const transactionFilter = document.getElementById("transactionFilter");
const searchInput = document.getElementById("searchInput");
const transactionCountElement = document.getElementById("transactionCount");
const emptyState = document.getElementById("emptyState");

const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toastIcon");
const toastMessage = document.getElementById("toastMessage");
const closeToastButton = document.getElementById("closeToast");

// Storage key
const STORAGE_KEY = "personalExpenseTrackerTransactions";

// Store all transactions
let transactions = loadTransactions();
let toastTimeout;

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Format a number as Sri Lankan Rupees
function formatCurrency(amount) {
    return "LKR " + Number(amount).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format a date for displaying in the table
function formatDate(dateString) {
    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Display today's date
function displayTodayDate() {
    document.getElementById("todayDate").textContent =
        new Date().toLocaleDateString("en-LK", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}

// Load saved transactions from localStorage
function loadTransactions() {
    try {
        const savedTransactions = localStorage.getItem(STORAGE_KEY);

        if (!savedTransactions) {
            return [];
        }

        const parsedTransactions = JSON.parse(savedTransactions);

        // Check that the stored data has the expected structure
        if (!Array.isArray(parsedTransactions)) {
            return [];
        }

        return parsedTransactions.filter(transaction =>
            transaction &&
            typeof transaction.id === "string" &&
            typeof transaction.description === "string" &&
            typeof transaction.amount === "number" &&
            Number.isFinite(transaction.amount) &&
            transaction.amount > 0 &&
            (transaction.type === "Income" ||
             transaction.type === "Expense") &&
            typeof transaction.category === "string" &&
            typeof transaction.date === "string"
        );
    } catch (error) {
        console.error("Unable to load transactions:", error);
        return [];
    }
}

// Save transactions to localStorage
function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
    } catch (error) {
        console.error("Unable to save transactions:", error);

        showToast(
            "Unable to save data. Check your browser storage settings.",
            "error"
        );

        return false;
    }
}

// Display a popup notification
function showToast(message, type = "success") {
    clearTimeout(toastTimeout);

    toastMessage.textContent = message;
    toast.classList.remove("error");
    toastIcon.textContent = "✓";

    if (type === "error") {
        toast.classList.add("error");
        toastIcon.textContent = "!";
    }

    toast.classList.add("show");

    // Hide the popup automatically after 3.5 seconds
    toastTimeout = setTimeout(() => {
        hideToast();
    }, 3500);
}

// Hide the popup
function hideToast() {
    toast.classList.remove("show");
    clearTimeout(toastTimeout);
}

// Calculate and display income, expenses, and balance
function updateSummary() {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(transaction => {
        if (transaction.type === "Income") {
            totalIncome += transaction.amount;
        } else {
            totalExpenses += transaction.amount;
        }
    });

    const balance = totalIncome - totalExpenses;

    totalIncomeElement.textContent = formatCurrency(totalIncome);
    totalExpensesElement.textContent = formatCurrency(totalExpenses);
    currentBalanceElement.textContent = formatCurrency(balance);

    // Show a negative balance in red
    currentBalanceElement.style.color =
        balance < 0 ? "#dc2626" : "#1e293b";
}

// Create a table cell safely
function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}

// Display transactions in the table
function renderTransactions() {
    transactionTableBody.replaceChildren();

    const selectedType = transactionFilter.value;
    const searchText = searchInput.value.trim().toLowerCase();

    const filteredTransactions = transactions
        .filter(transaction => {
            const matchesType =
                selectedType === "All" ||
                transaction.type === selectedType;

            const matchesSearch =
                transaction.description.toLowerCase().includes(searchText) ||
                transaction.category.toLowerCase().includes(searchText);

            return matchesType && matchesSearch;
        })
        .sort((first, second) => {
            // Show the newest date first
            const dateComparison = second.date.localeCompare(first.date);

            if (dateComparison !== 0) {
                return dateComparison;
            }

            // Use the ID as a tie-breaker for transactions on the same date
            return second.id.localeCompare(first.id);
        });

    filteredTransactions.forEach(transaction => {
        const row = document.createElement("tr");

        row.appendChild(createCell(formatDate(transaction.date)));
        row.appendChild(createCell(transaction.description));

        // Transaction type badge
        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");

        typeBadge.textContent = transaction.type;
        typeBadge.classList.add("type-badge");
        typeBadge.classList.add(
            transaction.type === "Income"
                ? "type-income"
                : "type-expense"
        );

        typeCell.appendChild(typeBadge);
        row.appendChild(typeCell);

        row.appendChild(createCell(transaction.category));

        // Amount cell
        const amountCell = createCell(
            (transaction.type === "Income" ? "+ " : "- ") +
            formatCurrency(transaction.amount)
        );

        amountCell.classList.add(
            transaction.type === "Income"
                ? "amount-income"
                : "amount-expense"
        );

        row.appendChild(amountCell);

        // Delete button
        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.setAttribute(
            "aria-label",
            `Delete transaction: ${transaction.description}`
        );

        deleteButton.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        transactionTableBody.appendChild(row);
    });

    // Display the empty state when no matching transactions exist
    emptyState.style.display =
        filteredTransactions.length === 0 ? "block" : "none";

    // Update the total number of stored transactions
    const count = transactions.length;

    transactionCountElement.textContent =
        count === 1 ? "1 transaction" : `${count} transactions`;
}

// Add a new transaction
transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const type = transactionTypeInput.value;
    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = transactionDateInput.value;

    // Validate required fields
    if (!type || !description || !category || !date) {
        showToast("Please complete all required fields.", "error");
        return;
    }

    // Validate transaction type
    if (type !== "Income" && type !== "Expense") {
        showToast("Please select a valid transaction type.", "error");
        return;
    }

    // Validate the amount
    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Please enter an amount greater than zero.", "error");
        amountInput.focus();
        return;
    }

    // Create a unique ID for the transaction
    const transaction = {
        id: crypto.randomUUID(),
        type: type,
        description: description,
        amount: amount,
        category: category,
        date: date
    };

    // Add the transaction to the list
    transactions.push(transaction);

    // Save before showing success
    if (!saveTransactions()) {
        transactions.pop();
        return;
    }

    // Update the page
    updateSummary();
    renderTransactions();

    // Reset the form and set today's date
    transactionForm.reset();
    transactionDateInput.value = getTodayDate();
    transactionTypeInput.value = "Income";

    // Show a popup after a successful transaction
    showToast(
        `${type} added successfully! Amount: ${formatCurrency(amount)}`
    );
});

// Delete a transaction
function deleteTransaction(transactionId) {
    const transaction = transactions.find(
        item => item.id === transactionId
    );

    if (!transaction) {
        showToast("Transaction not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${transaction.description}"?`
    );

    if (!confirmed) {
        return;
    }

    const previousTransactions = transactions;

    transactions = transactions.filter(
        item => item.id !== transactionId
    );

    // Restore the old list if saving fails
    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    updateSummary();
    renderTransactions();

    showToast(
        `${transaction.type} deleted successfully!`
    );
}

// Filter transactions by type
transactionFilter.addEventListener("change", function () {
    renderTransactions();
});

// Search transactions by description or category
searchInput.addEventListener("input", function () {
    renderTransactions();
});

// Reset the form using the Clear Form button
transactionForm.addEventListener("reset", function () {
    // Wait for the browser to reset the form fields
    setTimeout(() => {
        transactionDateInput.value = getTodayDate();
        transactionTypeInput.value = "Income";
    }, 0);
});

// Close the popup when the close button is clicked
closeToastButton.addEventListener("click", hideToast);

// Initialize the application
function initializeApp() {
    displayTodayDate();
    transactionDateInput.value = getTodayDate();

    updateSummary();
    renderTransactions();
}

// Start the application
initializeApp();
