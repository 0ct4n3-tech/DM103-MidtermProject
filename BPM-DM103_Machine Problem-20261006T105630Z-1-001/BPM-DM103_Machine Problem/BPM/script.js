const MENU = [
  ["Chicken Meal", 120],
  ["Burger Meal", 95],
  ["Spaghetti", 80],
  ["Fried Rice Meal", 110],
  ["Pork Sisig", 150],
  ["Halo-Halo", 65]
];

const STAGES = ["Placed", "Paid", "Confirmed", "Preparing", "Ready", "Completed"];

let orders = [];
let counter = 0;
let paid = false;

const $ = id => document.getElementById(id);

// Load state from local storage cache
try {
  const s = JSON.parse(localStorage.getItem("fo") || "null");
  if (s) {
    orders = s.orders || [];
    counter = s.counter || 0;
  }
} catch (e) {}

function save() {
  try {
    localStorage.setItem("fo", JSON.stringify({ orders, counter }));
  } catch (e) {}
}

// Populate menu items
$("food").innerHTML = MENU.map((m, i) => `<option value="${i}">${m[0]} - ₱${m[1]}</option>`).join("");

// Calculate total price based on selected item and quantity
function calc() {
  const q = parseInt($("qty").value) || 0;
  $("total").textContent = "₱" + (MENU[$("food").value][1] * Math.max(q, 0));
}

$("food").onchange = $("qty").oninput = calc;
calc();

function setPay(v) {
  paid = v;
  $("payYes").className = v ? "on" : "";
  $("payNo").className = v ? "" : "on";
}

$("payYes").onclick = () => setPay(true);
$("payNo").onclick = () => setPay(false);

// Place order handler
$("place").onclick = () => {
  const name = $("cust").value.trim();
  const qty = parseInt($("qty").value);

  if (!name) {
    $("err").textContent = "Enter the customer's name.";
    $("cust").focus();
    return;
  }
  if (!qty || qty < 1) {
    $("err").textContent = "Quantity must be at least 1.";
    return;
  }

  $("err").textContent = "";
  const [food, price] = MENU[$("food").value];
  counter++;

  orders.unshift({
    no: String(counter).padStart(3, "0"),
    customer: name,
    food,
    qty,
    total: price * qty,
    payment: paid ? "PAID" : "UNPAID",
    stage: paid ? 2 : 0
  });

  $("cust").value = "";
  $("qty").value = 1;
  setPay(false);
  calc();
  save();
  render();
};

// Clear all orders handler
$("clear").onclick = () => {
  if (orders.length && confirm("Remove all orders?")) {
    orders = [];
    counter = 0;
    save();
    render();
  }
};

$("exportTxt").onclick = () => {
  if (!orders.length){
    alert("No orders to export.");
    return;
  }
  const dataString = JSON.stringify({ orders, counter }, null, 2);
  const blob = new Blob([dataString], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-backup-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}


$("importTxt").onclick = () => $("fileInput").click();
$("fileInput").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try{
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.orders) && typeof data.counter === "number"){
        orders = data.orders
        counter = data.counter
        save();
        render();
        alert("File orders imported!");
      }else{
        alert("Invalid file format. Please upload a .txt file only");
      }
    }catch(err){
      alert("Contents of the file could not be read!")
    }
  };
  reader.readAsText(file);
  e.target.value = ""; // reset file loads on ImportTxt
}

function status(o) {
  return o.payment === "UNPAID" ? "PENDING PAYMENT" : STAGES[o.stage].toUpperCase();
}

function act(no, type) {
  const o = orders.find(x => x.no === no);
  if (!o) return;

  if (type === "pay") {
    o.payment = "PAID";
    o.stage = 2;
  } else if (o.payment === "PAID" && o.stage < 5) {
    o.stage++;
  }

  save();
  render();
}

function render() {
  if (!orders.length) {
    $("list").innerHTML = '<div class="empty">No orders yet. Fill in the form to place the first one.</div>';
    return;
  }

  $("list").innerHTML = orders.map(o => {
    const pend = o.payment === "UNPAID";
    const done = o.stage === 5 && !pend;
    const st = status(o);

    const steps = STAGES.map((s, i) => {
      let c = "step";
      if (pend) {
        if (i === 0) c += " now";
      } else if (i < o.stage || done) {
        c += " did";
      } else if (i === o.stage) {
        c += " now";
      }

      if (!pend && i === o.stage && !done) c = "step now";
      return `<div class="${c}"><i></i>${s}</div>`;
    }).join("");

    const nextLabel = o.stage === 2 ? "Start preparing" : o.stage === 3 ? "Mark ready" : o.stage === 4 ? "Complete order" : "";

    let btns = "";
    if (pend) {
      btns = `<button class="on" data-a="pay" data-n="${o.no}">Record payment</button>`;
    } else if (!done) {
      btns = `<button class="on" data-a="next" data-n="${o.no}">${nextLabel}</button>`;
    }

    return `<article class="order ${pend ? "pending" : done ? "done" : "active"}">
      <div class="head">
        <span class="no">Order ${o.no}</span>
        <span class="badge ${pend ? "PENDING" : done ? "COMPLETED" : ""}">${st}</span>
      </div>
      <dl>
        <dt>Customer</dt><dd>${esc(o.customer)}</dd>
        <dt>Food</dt><dd>${esc(o.food)} × ${o.qty}</dd>
        <dt>Price</dt><dd>₱${o.total}</dd>
        <dt>Payment</dt><dd><span class="badge ${pend ? "unpaid" : "paid"}">${o.payment}</span></dd>
        <dt>Order status</dt><dd>${st}</dd>
      </dl>
      <div class="steps">${steps}</div>
      <div class="acts">${btns}</div>
    </article>`;
  }).join("");
}

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

$("list").onclick = e => {
  const b = e.target.closest("button[data-a]");
  if (b) act(b.dataset.n, b.dataset.a);
};

render();