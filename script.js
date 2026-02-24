const balanceEl = document.getElementById("balance");
const amountInput = document.getElementById("amount");
const descInput = document.getElementById("description");
const loanInput = document.getElementById("isLoan");

const incomeBtn = document.getElementById("incomeBtn");
const expenseBtn = document.getElementById("expenseBtn");

const viewBtn = document.getElementById("viewMovements");
const backBtn = document.getElementById("backBtn");

const mainScreen = document.getElementById("mainScreen");
const movementsScreen = document.getElementById("movementsScreen");
const movementsList = document.getElementById("movementsList");

const downloadBtn = document.getElementById("downloadBtn");

let data = JSON.parse(localStorage.getItem("financeData")) || [];

function save() {
  localStorage.setItem("financeData", JSON.stringify(data));
}

function updateBalance() {
  const total = data.reduce((acc, item) => {
    return acc + item.amount;
  }, 0);

  balanceEl.textContent = "$" + total;
  balanceEl.style.color = total >= 0 ? "#2ecc71" : "#e74c3c";
}

function addMovement(type) {
  const amount = Number(amountInput.value);
  if (!amount) return;

  const movement = {
    id: Date.now(),
    amount: type === "income" ? amount : -amount,
    description: descInput.value,
    loan: loanInput.checked,
    date: new Date().toISOString()
  };

  data.push(movement);

  data.sort((a, b) => new Date(b.date) - new Date(a.date));

  save();
  updateBalance();
  renderMovements();

  amountInput.value = "";
  descInput.value = "";
  loanInput.checked = false;
}

incomeBtn.onclick = () => addMovement("income");
expenseBtn.onclick = () => addMovement("expense");

function renderMovements() {
  movementsList.innerHTML = "";

  data.forEach(m => {
    const div = document.createElement("div");
    div.className = "movement";

    div.innerHTML = `
      <strong>${m.amount > 0 ? "+" : ""}${m.amount}</strong>
      ${m.loan ? "(Préstamo)" : ""}
      <small>${new Date(m.date).toLocaleString()}</small>
      <div>${m.description || ""}</div>
      <div class="actions">
        <button onclick="editMovement(${m.id})">Editar</button>
        <button onclick="deleteMovement(${m.id})">Borrar</button>
      </div>
    `;

    movementsList.appendChild(div);
  });
}

function deleteMovement(id) {
  data = data.filter(m => m.id !== id);
  save();
  updateBalance();
  renderMovements();
}

function editMovement(id) {
  const m = data.find(x => x.id === id);
  amountInput.value = Math.abs(m.amount);
  descInput.value = m.description;
  loanInput.checked = m.loan;

  deleteMovement(id);
  mainScreen.classList.remove("hidden");
  movementsScreen.classList.add("hidden");
}

viewBtn.onclick = () => {
  mainScreen.classList.add("hidden");
  movementsScreen.classList.remove("hidden");
};

backBtn.onclick = () => {
  movementsScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
};

downloadBtn.onclick = () => {
  let csv = "Monto,Descripcion,Prestamo,Fecha\n";

  data.forEach(m => {
    csv += `${m.amount},"${m.description}",${m.loan},${m.date}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "movimientos.csv";
  a.click();
};

updateBalance();
renderMovements();