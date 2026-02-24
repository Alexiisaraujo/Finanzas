// =======================================
// ESTADO GLOBAL
// =======================================

let ledger = JSON.parse(localStorage.getItem("ledger")) || [];
let editingId = null;

const MAX_AMOUNT = 10000000; // Límite máximo permitido

// =======================================
// GUARDAR EN LOCALSTORAGE
// =======================================

function save() {
  localStorage.setItem("ledger", JSON.stringify(ledger));
}

// =======================================
// OBTENER TOTAL POR CUENTA (doble partida)
// =======================================

function getAccountTotal(account) {
  return ledger.reduce((total, entry) => {
    entry.entries.forEach(e => {
      if (e.account === account) {
        total += e.debit - e.credit;
      }
    });
    return total;
  }, 0);
}

// =======================================
// FORMATEO SEGURO DE DINERO
// =======================================

function formatMoney(value) {
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// =======================================
// ACTUALIZAR BALANCES EN PANTALLA
// =======================================

function updateBalances() {

  const caja = getAccountTotal("Caja");
  const prestamos = Math.abs(getAccountTotal("Prestamos"));
  const deudas = Math.abs(getAccountTotal("Deudas"));

  document.getElementById("balance").textContent = "$" + formatMoney(caja);
  document.getElementById("loanTotal").textContent = formatMoney(prestamos);
  document.getElementById("debtTotal").textContent = formatMoney(deudas);
  document.getElementById("realBalance").textContent =
    formatMoney(caja - prestamos - deudas);

  document.getElementById("balance").style.color =
    caja >= 0 ? "#2ecc71" : "#e74c3c";
}

// =======================================
// VALIDAR MONTO
// =======================================

function validateAmount(amount) {
  if (isNaN(amount) || amount <= 0) {
    alert("Monto inválido.");
    return false;
  }

  if (amount > MAX_AMOUNT) {
    alert("Número demasiado grande.");
    return false;
  }

  return true;
}

// =======================================
// POPUP DE PRÉSTAMO (TOTAL A PAGAR)
// =======================================

function loanPopup(principal) {

  let totalToPay = Number(prompt("¿Cuánto vas a pagar en total?"));

  if (isNaN(totalToPay) || totalToPay <= principal) {
    alert("El total debe ser mayor que el monto recibido.");
    return null;
  }

  let installments = Number(prompt("¿En cuántas cuotas?"));

  if (isNaN(installments) || installments <= 0) {
    alert("Cuotas inválidas.");
    return null;
  }

  const interestAmount = totalToPay - principal;
  const interestPercent = (interestAmount / principal) * 100;
  const installmentValue = totalToPay / installments;

  return {
    principal,
    totalToPay,
    interestAmount,
    interestPercent: interestPercent.toFixed(2),
    installments,
    installmentValue
  };
}

// =======================================
// AGREGAR O EDITAR MOVIMIENTO
// =======================================

function addEntry(type) {

  const amount = Number(document.getElementById("amount").value);
  const description = document.getElementById("description").value;
  const operationType = document.getElementById("operationType").value;

  if (!validateAmount(amount)) return;

  const cajaActual = getAccountTotal("Caja");
  const deudaActual = Math.abs(getAccountTotal("Deudas"));
  const prestamoActual = Math.abs(getAccountTotal("Prestamos"));

  // No pagar si no hay saldo
  if (type === "expense" && amount > cajaActual) {
    alert("Master no tenés plata para pagar esto.");
    return;
  }

  // No pagar más deuda de la que existe
  if (operationType === "debt" && type === "expense" && amount > deudaActual) {
    alert("No podés pagar más deuda de la que debés.");
    return;
  }

  // No pagar más préstamo del que existe
  if (operationType === "loan" && type === "expense" && amount > prestamoActual) {
    alert("No podés pagar más préstamo del que debés.");
    return;
  }

  let entries = [];
  let loanDetails = null;

  // ================= NORMAL =================
  if (operationType === "normal") {

    if (type === "income") {
      entries = [
        { account: "Caja", debit: amount, credit: 0 },
        { account: "Ingresos", debit: 0, credit: amount }
      ];
    } else {
      entries = [
        { account: "Gastos", debit: amount, credit: 0 },
        { account: "Caja", debit: 0, credit: amount }
      ];
    }
  }

  // ================= PRÉSTAMO =================
  if (operationType === "loan") {

    if (type === "income") {

      loanDetails = loanPopup(amount);
      if (!loanDetails) return;

      entries = [
        { account: "Caja", debit: amount, credit: 0 },
        { account: "Prestamos", debit: 0, credit: loanDetails.totalToPay }
      ];

    } else {

      entries = [
        { account: "Prestamos", debit: amount, credit: 0 },
        { account: "Caja", debit: 0, credit: amount }
      ];
    }
  }

  // ================= DEUDA =================
  if (operationType === "debt") {

    if (type === "income") {
      entries = [
        { account: "Deudas", debit: 0, credit: amount }
      ];
    } else {
      entries = [
        { account: "Deudas", debit: amount, credit: 0 },
        { account: "Caja", debit: 0, credit: amount }
      ];
    }
  }

  const entry = {
    id: editingId || Date.now(),
    date: new Date().toISOString(),
    description,
    amount,
    type,
    operationType,
    loanDetails,
    entries
  };

  if (editingId) {
    ledger = ledger.map(l => l.id === editingId ? entry : l);
    editingId = null;
  } else {
    ledger.push(entry);
  }

  ledger.sort((a,b)=> new Date(b.date) - new Date(a.date));

  save();
  render();
  updateBalances();

  document.getElementById("amount").value = "";
  document.getElementById("description").value = "";
}

// =======================================
// RENDER MOVIMIENTOS
// =======================================

function render() {

  const list = document.getElementById("movementsList");
  list.innerHTML = "";

  ledger.forEach(l => {

    const div = document.createElement("div");
    div.className = "movement";

    let extra = "";

    if (l.loanDetails) {
      extra = `
        <br><small>
        Total: $${formatMoney(l.loanDetails.totalToPay)} |
        Interés: ${l.loanDetails.interestPercent}% |
        Cuotas: ${l.loanDetails.installments} |
        Valor cuota: $${formatMoney(l.loanDetails.installmentValue)}
        </small>
      `;
    }

    div.innerHTML = `
      <div class="amount">
        ${l.type === "income" ? "+" : "-"}$${formatMoney(l.amount)}
      </div>
      <div>${l.description || "Sin descripción"}</div>
      <small>${new Date(l.date).toLocaleString()} (${l.operationType})</small>
      ${extra}
      <div class="actions">
        <button data-edit="${l.id}">Editar</button>
        <button data-delete="${l.id}">Borrar</button>
      </div>
    `;

    list.appendChild(div);
  });
}

// =======================================
// EVENT DELEGATION (EDITAR Y BORRAR)
// =======================================

document.getElementById("movementsList").addEventListener("click", (e) => {

  if (e.target.dataset.delete) {
    const id = Number(e.target.dataset.delete);
    ledger = ledger.filter(l => l.id !== id);
    save();
    render();
    updateBalances();
  }

  if (e.target.dataset.edit) {
    const id = Number(e.target.dataset.edit);
    const entry = ledger.find(l => l.id === id);

    document.getElementById("amount").value = entry.amount;
    document.getElementById("description").value = entry.description;
    document.getElementById("operationType").value = entry.operationType;

    editingId = id;

    mainScreen.classList.remove("hidden");
    movementsScreen.classList.add("hidden");
  }

});

// =======================================
// EVENTOS BOTONES
// =======================================

document.getElementById("incomeBtn").addEventListener("click", () => addEntry("income"));
document.getElementById("expenseBtn").addEventListener("click", () => addEntry("expense"));

document.getElementById("viewBtn").addEventListener("click", () => {
  mainScreen.classList.add("hidden");
  movementsScreen.classList.remove("hidden");
});

document.getElementById("backBtn").addEventListener("click", () => {
  movementsScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
});

// =======================================
updateBalances();
render();