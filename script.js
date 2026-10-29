let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
let customers = JSON.parse(localStorage.getItem('customers')) || [];
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let salesLog = JSON.parse(localStorage.getItem('salesLog')) || [];
let returnsLog = JSON.parse(localStorage.getItem('returnsLog')) || [];
let supplierPayments = JSON.parse(localStorage.getItem('supplierPayments')) || [];
let isDarkMode = localStorage.getItem('isDarkMode') === 'true';
let currentUser = localStorage.getItem('currentUser');
let currentSharedInvoice = null;

if (isDarkMode) {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
}

if (currentUser) {
    showApp(currentUser);
}

function handleLogin() {
    let input = document.getElementById('auth-input').value;
    let pass = document.getElementById('auth-pass').value;
    if(input && pass) {
        localStorage.setItem('currentUser', input);
        showApp(input);
    } else {
        alert('يرجى إدخال البيانات المطلوبة');
    }
}

function handleGoogleLogin() {
    let googleUser = "مندوب (حساب جوجل)";
    localStorage.setItem('currentUser', googleUser);
    showApp(googleUser);
}

function showApp(username) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    document.getElementById('user-info-display').innerText = `المستخدم: ${username}`;
    updateUI();
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
    document.getElementById('page-title').innerText = element.innerText;
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('isDarkMode', isDarkMode);
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
}

// إضافة وحدة قياس جديدة مخصصة
function addNewUnit() {
    let newUnit = prompt('أدخل اسم الوحدة الجديدة (مثال: برميل، كيس، طبق):');
    if (newUnit && newUnit.trim() !== '') {
        let unitSelects = [document.getElementById('item-unit'), document.getElementById('return-unit')];
        unitSelects.forEach(sel => {
            if (sel) {
                let opt = document.createElement('option');
                opt.value = newUnit.trim();
                opt.innerText = newUnit.trim();
                opt.selected = true;
                sel.appendChild(opt);
            }
        });
        alert(`تمت إضافة الوحدة الجديدة: (${newUnit})`);
    }
}

function autofillPrice() {
    let prodIndex = document.getElementById('sell-product').value;
    let mode = document.getElementById('sell-mode').value;
    if (prodIndex !== "") {
        let prod = inventory[prodIndex];
        if (mode === 'piece') {
            document.getElementById('sell-price').value = prod.piecePrice || 0;
            document.getElementById('sell-unit-display').innerText = `الوحدة: قطعة (مفرد)`;
        } else {
            document.getElementById('sell-price').value = prod.price;
            document.getElementById('sell-unit-display').innerText = `الوحدة: ${prod.unit || 'طرد'}`;
        }
    } else {
        document.getElementById('sell-unit-display').innerText = `الوحدة: ---`;
    }
}

function changeSellMode() {
    autofillPrice();
}

function completeSale() {
    let custIndex = document.getElementById('sell-customer').value;
    let prodIndex = document.getElementById('sell-product').value;
    let qtySold = Number(document.getElementById('sell-qty').value);
    let priceSold = Number(document.getElementById('sell-price').value);
    let paidAmount = Number(document.getElementById('sell-paid').value) || 0;
    let mode = document.getElementById('sell-mode').value;

    if (custIndex === "" || prodIndex === "" || !qtySold || !priceSold) {
        alert('يرجى تعبئة كافة بيانات الفاتورة بدقة');
        return;
    }

    let prod = inventory[prodIndex];
    let unitLabel = prod.unit || 'طرد';
    let totalAmount = qtySold * priceSold;
    let costTotal = 0;

    if (mode === 'piece') {
        let piecesPerUnit = Number(prod.piecesPerUnit) || 1;
        let totalPiecesNeeded = qtySold;
        let currentTotalPieces = (Number(prod.qty) * piecesPerUnit);

        if (totalPiecesNeeded > currentTotalPieces) {
            alert(`القطع غير كافية في السيارة! (المتبقي الإجمالي بالقطع: ${currentTotalPieces})`);
            return;
        }

        let newTotalPieces = currentTotalPieces - totalPiecesNeeded;
        prod.qty = (newTotalPieces / piecesPerUnit).toFixed(2);
        
        let unitCost = Number(prod.cost || 0);
        let costPerPiece = unitCost / piecesPerUnit;
        costTotal = qtySold * costPerPiece;
        unitLabel = 'قطعة';
    } else {
        if (qtySold > Number(prod.qty)) {
            alert(`الكمية غير كافية في السيارة! (المتبقي: ${prod.qty})`);
            return;
        }
        prod.qty = Number(prod.qty) - qtySold;
        costTotal = qtySold * Number(prod.cost || 0);
    }

    let remainingDebt = totalAmount - paidAmount;
    if (remainingDebt > 0) {
        customers[custIndex].debt = Number(customers[custIndex].debt) + remainingDebt;
    }

    let profit = totalAmount - costTotal;

    salesLog.push({
        customerName: customers[custIndex].name,
        productName: prod.name,
        qty: qtySold,
        unit: unitLabel,
        total: totalAmount,
        paid: paidAmount,
        remaining: remainingDebt,
        costTotal: costTotal,
        profit: profit,
        date: new Date().toLocaleDateString('ar-EG')
    });

    document.getElementById('sell-qty').value = '';
    document.getElementById('sell-price').value = '';
    document.getElementById('sell-paid').value = '';

    updateUI();
    alert('تمت عملية البيع وخصم الكمية بنجاح!');
}

// دوال طباعة الفاتورة والمشاركة
function openPrintModal(index) {
    let sale = salesLog[index];
    currentSharedInvoice = sale;
    document.getElementById('inv-date').innerText = sale.date;
    document.getElementById('inv-customer').innerText = sale.customerName;
    document.getElementById('inv-product').innerText = sale.productName;
    document.getElementById('inv-qty').innerText = `${sale.qty} ${sale.unit}`;
    document.getElementById('inv-total').innerText = sale.total;
    document.getElementById('inv-paid').innerText = sale.paid;
    document.getElementById('inv-remaining').innerText = sale.remaining;
    
    document.getElementById('print-invoice-modal').style.display = 'flex';
}

function closePrintModal() {
    document.getElementById('print-invoice-modal').style.display = 'none';
}

function shareViaWhatsApp() {
    if (!currentSharedInvoice) return;
    let s = currentSharedInvoice;
    let text = `🚚 *فاتورة مبيعات سيارة التوزيع* 🚚\n` +
               `📅 التاريخ: ${s.date}\n` +
               `👤 الزبون: ${s.customerName}\n` +
               `📦 المادة: ${s.productName}\n` +
               `🔢 الكمية: ${s.qty} ${s.unit}\n` +
               `💰 الإجمالي: ${s.total} ل.س.ج\n` +
               `💵 المقبوض: ${s.paid} ل.س.ج\n` +
               `📉 المتبقي (دين): ${s.remaining} ل.س.ج\n` +
               `--------------------\n` +
               `شكراً لتعاملكم معنا!`;
    
    let encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}

function addReturnItem() {
    let custIndex = document.getElementById('return-customer').value;
    let itemName = document.getElementById('return-item').value;
    let qty = document.getElementById('return-qty').value;
    let unit = document.getElementById('return-unit').value;
    let type = document.getElementById('return-type').value;

    if (custIndex !== "" && itemName && qty) {
        returnsLog.push({
            customerName: customers[custIndex].name,
            itemName,
            qty,
            unit,
            type,
            date: new Date().toLocaleDateString('ar-EG')
        });
        document.getElementById('return-item').value = '';
        document.getElementById('return-qty').value = '';
        updateUI();
        alert('تم تسجيل الراجع بنجاح');
    } else {
        alert('يرجى ملء بيانات المرتجع');
    }
}

function openEditModal(index) {
    let cust = customers[index];
    document.getElementById('edit-cust-index').value = index;
    document.getElementById('edit-cust-name').value = cust.name;
    document.getElementById('edit-cust-phone').value = cust.phone || '';
    document.getElementById('edit-cust-address').value = cust.address || '';
    document.getElementById('edit-cust-debt').value = cust.debt || 0;
    document.getElementById('edit-cust-notes').value = cust.notes || '';
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

function saveCustomerEdit() {
    let index = document.getElementById('edit-cust-index').value;
    customers[index].name = document.getElementById('edit-cust-name').value;
    customers[index].phone = document.getElementById('edit-cust-phone').value;
    customers[index].address = document.getElementById('edit-cust-address').value;
    customers[index].debt = document.getElementById('edit-cust-debt').value;
    customers[index].notes = document.getElementById('edit-cust-notes').value;
    closeEditModal();
    updateUI();
}

function addSupplierPayment() {
    let desc = document.getElementById('supplier-payment-desc').value;
    let amount = Number(document.getElementById('supplier-payment-amount').value);
    if(desc && amount) {
        supplierPayments.push({ desc, amount, date: new Date().toLocaleDateString('ar-EG') });
        document.getElementById('supplier-payment-desc').value = '';
        document.getElementById('supplier-payment-amount').value = '';
        updateUI();
        alert('تم تسجيل دفعة الشركة بنجاح وخمها من الصندوق');
    } else {
        alert('يرجى إدخال بيان الدفعة والمبلغ بدقة');
    }
}

function deleteSupplierPayment(index) {
    supplierPayments.splice(index, 1);
    updateUI();
}

function updateUI() {
    let custSelects = [document.getElementById('sell-customer'), document.getElementById('return-customer')];
    custSelects.forEach(sel => {
        if(sel) {
            sel.innerHTML = '<option value="">اختر الزبون...</option>';
            customers.forEach((cust, index) => {
                sel.innerHTML += `<option value="${index}">${cust.name}</option>`;
            });
        }
    });

    let prodSelect = document.getElementById('sell-product');
    prodSelect.innerHTML = '<option value="">اختر المادة من الجرد...</option>';
    inventory.forEach((prod, index) => {
        prodSelect.innerHTML += `<option value="${index}">${prod.name} (${prod.qty} ${prod.unit || 'طرد'})</option>`;
    });

    let sortType = document.getElementById('sort-select').value;
    let sortedInventory = [...inventory];
    if (sortType === 'alphabet') sortedInventory.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (sortType === 'highest-qty') sortedInventory.sort((a, b) => Number(b.qty) - Number(a.qty));
    else if (sortType === 'oldest') {}
    else sortedInventory.reverse();

    const invList = document.getElementById('inventory-list');
    invList.innerHTML = '';
    let totalItemsCount = sortedInventory.length;
    
    sortedInventory.forEach((item) => {
        let originalIndex = inventory.indexOf(item);
        let piecesInfo = item.piecesPerUnit ? `${item.piecesPerUnit} قطعة/${item.unit || 'طرد'}` : 'لا يوجد تجزئة';
        invList.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${Number(item.qty).toFixed(2)}</td>
                <td><span class="unit-badge">${item.unit || 'طرد'}</span></td>
                <td><span style="font-size: 12px; color: #0284c7;">${piecesInfo}</span></td>
                <td>${item.cost || 0} ل.س.ج</td>
                <td>${item.price} ل.س.ج <br><small style="color: #10b981;">(القطعة: ${item.piecePrice || 0})</small></td>
                <td>${item.date || '---'}</td>
                <td><button class="delete-btn" onclick="deleteItem(${originalIndex})">حذف</button></td>
            </tr>`;
    });
    document.getElementById('total-items').innerText = totalItemsCount;

    const custLi = document.getElementById('customers-list');
    custLi.innerHTML = '';
    let totalDebtsSum = 0;
    customers.forEach((cust, index) => {
        totalDebtsSum += Number(cust.debt);
        custLi.innerHTML += `
            <tr>
                <td>${cust.name}</td>
                <td>${cust.phone || '---'}</td>
                <td>${cust.address || '---'}</td>
                <td>${cust.debt} ل.س.ج</td>
                <td>${cust.notes || '---'}</td>
                <td>
                    <button class="edit-btn" onclick="openEditModal(${index})">تعديل ✏️</button>
                    <button class="delete-btn" onclick="deleteCustomer(${index})">حذف</button>
                </td>
            </tr>`;
    });
    document.getElementById('total-customers').innerText = customers.length;
    document.getElementById('total-debts').innerText = totalDebtsSum + ' ل.س.ج';

    const salesLogList = document.getElementById('sales-log-list');
    salesLogList.innerHTML = '';
    let totalProfitSum = 0;
    let totalSalesSum = 0;
    let totalCostOfSales = 0;
    let totalPaidCashFromSales = 0;

    salesLog.forEach((sale, index) => {
        totalProfitSum += Number(sale.profit || 0);
        totalSalesSum += Number(sale.total || 0);
        totalCostOfSales += Number(sale.costTotal || 0);
        totalPaidCashFromSales += Number(sale.paid || 0);

        salesLogList.innerHTML += `
            <tr>
                <td>${sale.customerName}</td>
                <td>${sale.productName}</td>
                <td>${sale.qty} ${sale.unit}</td>
                <td>${sale.total} ل.س.ج</td>
                <td>${sale.paid} ل.س.ج</td>
                <td>${sale.remaining} ل.س.ج</td>
                <td>${sale.date}</td>
                <td><button class="edit-btn" onclick="openPrintModal(${index})">🖨️ طباعة ومشاركة</button></td>
            </tr>`;
    });

    let totalExpensesSum = 0;
    expenses.forEach(exp => totalExpensesSum += Number(exp.amount));
    
    const expList = document.getElementById('expenses-list');
    expList.innerHTML = '';
    expenses.forEach(exp => {
        expList.innerHTML += `<tr><td>${exp.desc}</td><td>${exp.amount} ل.س.ج</td></tr>`;
    });

    // حساب إجمالي دفعات الشركة
    let totalSupplierPaidSum = 0;
    const supList = document.getElementById('supplier-payments-list');
    supList.innerHTML = '';
    supplierPayments.forEach((sup, index) => {
        totalSupplierPaidSum += Number(sup.amount);
        supList.innerHTML += `
            <tr>
                <td>${sup.desc}</td>
                <td>${sup.amount} ل.س.ج</td>
                <td>${sup.date}</td>
                <td><button class="delete-btn" onclick="deleteSupplierPayment(${index})">حذف</button></td>
            </tr>`;
    });
    document.getElementById('total-supplier-paid').innerText = totalSupplierPaidSum + ' ل.س.ج';

    // حساب رصيد الصندوق الحالي (النقد المقبوض من المبيعات ناقص المصاريف وناقص المدفوع للشركة)
    let currentBoxBalance = totalPaidCashFromSales - totalExpensesSum - totalSupplierPaidSum;
    document.getElementById('box-balance').innerText = currentBoxBalance + ' ل.س.ج';

    const returnsTbl = document.getElementById('returns-list');
    returnsTbl.innerHTML = '';
    returnsLog.forEach(ret => {
        returnsTbl.innerHTML += `<tr><td>${ret.customerName}</td><td>${ret.itemName}</td><td>${ret.qty} ${ret.unit || 'طرد'}</td><td>${ret.type}</td><td>${ret.date}</td></tr>`;
    });

    let netProfitFinal = totalProfitSum - totalExpensesSum;
    document.getElementById('net-profit').innerText = netProfitFinal + ' ل.س.ج';
    document.getElementById('total-profits-card').innerText = totalProfitSum + ' ل.س.ج';

    // تحديث تفاصيل الأرباح في صفحة الميزانية
    document.getElementById('detailed-total-sales').innerText = totalSalesSum + ' ل.س.ج';
    document.getElementById('detailed-total-cost').innerText = totalCostOfSales + ' ل.س.ج';
    document.getElementById('detailed-total-expenses').innerText = totalExpensesSum + ' ل.س.ج';
    document.getElementById('detailed-net-profit').innerText = netProfitFinal + ' ل.س.ج';

    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('salesLog', JSON.stringify(salesLog));
    localStorage.setItem('returnsLog', JSON.stringify(returnsLog));
    localStorage.setItem('supplierPayments', JSON.stringify(supplierPayments));
}

function addProduct() {
    let name = document.getElementById('item-name').value;
    let qty = document.getElementById('item-qty').value;
    let unit = document.getElementById('item-unit').value;
    let piecesPerUnit = document.getElementById('item-pieces-per-unit').value || '';
    let piecePrice = document.getElementById('item-piece-price').value || 0;
    let cost = document.getElementById('item-cost').value || 0;
    let price = document.getElementById('item-price').value;

    if(name && qty && price) {
        inventory.push({ 
            name, 
            qty, 
            unit, 
            piecesPerUnit, 
            piecePrice, 
            cost, 
            price, 
            date: new Date().toLocaleDateString('ar-EG') 
        });
        document.getElementById('item-name').value = '';
        document.getElementById('item-qty').value = '';
        document.getElementById('item-pieces-per-unit').value = '';
        document.getElementById('item-piece-price').value = '';
        document.getElementById('item-cost').value = '';
        document.getElementById('item-price').value = '';
        updateUI();
    } else {
        alert('يرجى ملء الحقول الأساسية للمادة');
    }
}

function deleteItem(index) { inventory.splice(index, 1); updateUI(); }

function addCustomer() {
    let name = document.getElementById('cust-name').value;
    let phone = document.getElementById('cust-phone').value;
    let address = document.getElementById('cust-address').value;
    let debt = document.getElementById('cust-debt').value || 0;
    let notes = document.getElementById('cust-notes').value;
    if(name) {
        customers.push({ name, phone, address, debt, notes });
        document.getElementById('cust-name').value = '';
        document.getElementById('cust-phone').value = '';
        document.getElementById('cust-address').value = '';
        document.getElementById('cust-debt').value = '';
        document.getElementById('cust-notes').value = '';
        updateUI();
    } else { alert('يرجى كتابة اسم الزبون'); }
}

function deleteCustomer(index) { customers.splice(index, 1); updateUI(); }

function addExpense() {
    let desc = document.getElementById('expense-desc').value;
    let amount = document.getElementById('expense-amount').value;
    if(desc && amount) {
        expenses.push({ desc, amount });
        document.getElementById('expense-desc').value = '';
        document.getElementById('expense-amount').value = '';
        updateUI();
    } else { alert('يرجى إدخال المصروف'); }
}