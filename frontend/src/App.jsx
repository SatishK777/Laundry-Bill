import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";

const money = (n) => `₹${Number(n || 0).toFixed(0)}`;

// Reusable Custom Searchable Select for Customers
function SearchableSelect({ items, selectedId, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedItem = items.find((item) => item._id === selectedId);

  useEffect(() => {
    if (selectedItem) {
      setSearch(selectedItem.name);
    } else if (selectedId === "") {
      setSearch("");
    }
  }, [selectedId, selectedItem]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        // Restore label
        if (selectedItem) {
          setSearch(selectedItem.name);
        } else {
          setSearch("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem]);

  return (
    <div className="search-select-container" ref={dropdownRef}>
      <input
        type="text"
        className="search-select-input"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          const match = items.find(
            (item) => item.name.toLowerCase() === e.target.value.toLowerCase(),
          );
          if (match) {
            onChange(match._id);
          } else if (e.target.value === "") {
            onChange("");
          }
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch("");
        }}
      />
      <div className="search-select-arrow">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {isOpen && (
        <div className="search-select-dropdown">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                className={`search-select-item ${
                  item._id === selectedId ? "selected" : ""
                }`}
                onClick={() => {
                  onChange(item._id);
                  setSearch(item.name);
                  setIsOpen(false);
                }}
              >
                {item.name}
              </div>
            ))
          ) : (
            <div className="search-select-no-results">
              No customers found / कोई ग्राहक नहीं मिला
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("entry");
  const [customers, setCustomers] = useState([]);
  const [common, setCommon] = useState(null);
  const [rates, setRates] = useState([]);
  const [todayStats, setTodayStats] = useState({ entries: 0, amount: 0 });
  const [monthStats, setMonthStats] = useState({ entries: 0, amount: 0 });
  const [entryDate, setEntryDate] = useState("");
  const [billMonth, setBillMonth] = useState("");
  const [entryLaundry, setEntryLaundry] = useState("");
  const [billLaundry, setBillLaundry] = useState("");
  const [entrySearch, setEntrySearch] = useState("");
  const [billSearch, setBillSearch] = useState("");
  const [commonQty, setCommonQty] = useState(0);
  const [itemQtys, setItemQtys] = useState({});
  const [bill, setBill] = useState(null);
  const [newLaundryName, setNewLaundryName] = useState("");
  const [newItem, setNewItem] = useState({ en: "", hi: "", rate: "" });
  const [commonForm, setCommonForm] = useState({ label: "", rate: 0 });
  const [entriesMonth, setEntriesMonth] = useState("");
  const [allEntries, setAllEntries] = useState([]);
  const [customerEntries, setCustomerEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editCommonQty, setEditCommonQty] = useState(0);
  const [editItemQtys, setEditItemQtys] = useState({});
  const [editSpecialSearch, setEditSpecialSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [specialSearch, setSpecialSearch] = useState("");
  const [daySearch, setDaySearch] = useState("");
  const [expandedDates, setExpandedDates] = useState({});
  const [summaryMonth, setSummaryMonth] = useState("");
  const [summaryEntries, setSummaryEntries] = useState([]);
  const [billsList, setBillsList] = useState([]);
  const [billMode, setBillMode] = useState("single");
  const [ledgerMonth, setLedgerMonth] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState([]);

  const apiGet = async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error("API error");
    return res.json();
  };
  const apiPost = async (path, body) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || "API error");
      err.status = res.status;
      throw err;
    }
    return data;
  };
  const apiPut = async (path, body) => {
    const res = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || "API error");
      err.status = res.status;
      throw err;
    }
    return data;
  };
  const apiDelete = async (path) => {
    const res = await fetch(path, { method: "DELETE" });
    if (!res.ok) throw new Error("API error");
    return res.json();
  };

  const loadBaseData = async () => {
    const [c, cm, r] = await Promise.all([
      apiGet("/api/customers"),
      apiGet("/api/common"),
      apiGet("/api/rates"),
    ]);
    setCustomers(c);
    setCommon(cm);
    setRates(r);
    setCommonForm({ label: "Common", rate: cm?.rate || 0 });
    if (c.length && !entryLaundry) {
      setEntryLaundry(c[0]._id);
      setEntrySearch(c[0].name);
    }
    if (c.length && !billLaundry) {
      setBillLaundry(c[0]._id);
      setBillSearch(c[0].name);
    }
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);
    if (!entryDate) setEntryDate(today);
    if (!billMonth) setBillMonth(month);
    if (!entriesMonth) setEntriesMonth(month);
    if (!summaryMonth) setSummaryMonth(month);
    if (!ledgerMonth) setLedgerMonth(month);
  };

  const calcAmount = (entry, ratesList, commonRate) => {
    let activeCommonRate = Number(commonRate || 0);
    if (entry.laundryId && customers) {
      const customer = customers.find((c) => c._id === entry.laundryId);
      if (customer) {
        const name = customer.name.replace(/\s+/g, "").toLowerCase();
        if (
          name === "shriram" ||
          (name.includes("shri") && name.includes("ram")) ||
          name === "sachin"
        ) {
          activeCommonRate = 3;
        } else if (name === "umesh") {
          activeCommonRate = 3.5;
        }
      }
    }

    let total = Number(entry.commonQty || 0) * activeCommonRate;
    for (const [id, qty] of Object.entries(entry.items || {})) {
      const item = ratesList.find((r) => r._id === id);
      if (item) total += Number(qty) * Number(item.rate || 0);
    }
    return total;
  };

  const loadStats = async () => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const entries = await apiGet(`/api/entries?month=${monthKey}`);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayEntries = entries.filter((e) => e.date === todayStr);
    setTodayStats({
      entries: todayEntries.length,
      amount: todayEntries.reduce(
        (s, e) => s + calcAmount(e, rates, common?.rate),
        0,
      ),
    });
    setMonthStats({
      entries: entries.length,
      amount: entries.reduce(
        (s, e) => s + calcAmount(e, rates, common?.rate),
        0,
      ),
    });
  };

  useEffect(() => {
    loadBaseData().catch(() =>
      alert("Server not running / सर्वर चालू नहीं है"),
    );
  }, []);

  useEffect(() => {
    if (common && rates.length) loadStats();
  }, [common, rates]);

  // Sync selection search values automatically if selection is loaded
  useEffect(() => {
    if (customers.length) {
      if (entryLaundry) {
        const found = customers.find((c) => c._id === entryLaundry);
        if (found) setEntrySearch(found.name);
      }
      if (billLaundry) {
        const found = customers.find((c) => c._id === billLaundry);
        if (found) setBillSearch(found.name);
      }
    }
  }, [customers, entryLaundry, billLaundry]);

  const handleAddEntry = async () => {
    if (!entryLaundry || !entryDate) return;
    const items = {};
    Object.entries(itemQtys).forEach(([id, qty]) => {
      if (Number(qty) > 0) items[id] = Number(qty);
    });
    try {
      await apiPost("/api/entries", {
        laundryId: entryLaundry,
        date: entryDate,
        commonQty: Number(commonQty || 0),
        items,
      });
      setCommonQty(0);
      setItemQtys({});
      await loadStats();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Entry saved / एंट्री सेव हो गई",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (err) {
      if (err?.status === 409) {
        Swal.fire({
          icon: "error",
          title: "Only one entry allowed",
          text: "इस ग्राहक के लिए इस तारीख पर पहले से एंट्री है",
        });
        return;
      }
      Swal.fire({
        icon: "error",
        title: "Could not save entry",
        text: "एंट्री सेव नहीं हुई",
      });
    }
  };

  const handleGenerateBill = async () => {
    if (!billLaundry || !billMonth) return;
    try {
      const data = await apiGet(
        `/api/bill?laundryId=${billLaundry}&month=${billMonth}`,
      );

      let hiName = "";
      try {
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(data.customer)}`,
        );
        if (res.ok) {
          const transData = await res.json();
          hiName = transData[0][0][0] || "";
        }
      } catch (e) {
        console.error("Failed to translate customer name", e);
      }

      setBill({
        ...data,
        customerHi: hiName,
      });
      setBillMode("single");
      setBillsList([]);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to generate bill / बिल बनाने में विफल",
        text:
          err.message ||
          "Could not connect to database / डेटाबेस से कनेक्ट नहीं हो सका",
      });
    }
  };

  const handleGenerateAllBills = async () => {
    if (!billMonth) return;
    try {
      const entries = await apiGet(`/api/entries?month=${billMonth}`);

      const billPromises = customers.map(async (customer) => {
        const custEntries = entries.filter((e) => e.laundryId === customer._id);
        if (custEntries.length === 0) return null;

        let commonQty = 0;
        const itemTotals = {};

        custEntries.forEach((e) => {
          commonQty += Number(e.commonQty || 0);
          if (e.items) {
            Object.entries(e.items || {}).forEach(([id, qty]) => {
              itemTotals[id] = (itemTotals[id] || 0) + Number(qty || 0);
            });
          }
        });

        const rows = [];
        let totalAmount = 0;

        let activeCommonRate = Number(common?.rate || 0);
        const nameLower = customer.name.replace(/\s+/g, "").toLowerCase();
        if (
          nameLower === "shriram" ||
          (nameLower.includes("shri") && nameLower.includes("ram")) ||
          nameLower === "sachin"
        ) {
          activeCommonRate = 3;
        } else if (nameLower === "umesh") {
          activeCommonRate = 3.5;
        }

        if (commonQty > 0 && common) {
          const amount = commonQty * activeCommonRate;
          totalAmount += amount;
          rows.push({ name: "Common", qty: commonQty, amount });
        }

        rates.forEach((item) => {
          const qty = itemTotals[item._id] || 0;
          if (qty > 0) {
            const amount = qty * Number(item.rate || 0);
            totalAmount += amount;
            rows.push({ name: `${item.en} (${item.hi})`, qty, amount });
          }
        });

        // Translate customer name
        let hiName = "";
        try {
          const res = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(customer.name)}`,
          );
          if (res.ok) {
            const transData = await res.json();
            hiName = transData[0][0][0] || "";
          }
        } catch (e) {
          console.error(e);
        }

        return {
          customer: customer.name,
          customerHi: hiName,
          month: billMonth,
          rows,
          totalAmount,
        };
      });

      const list = (await Promise.all(billPromises)).filter((b) => b !== null);

      if (list.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No entries found / कोई एंट्री नहीं मिली",
          text: "इस महीने के लिए कोई एंट्री उपलब्ध नहीं है",
        });
        return;
      }

      setBillsList(list);
      setBillMode("all");
      setBill(null);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Generated ${list.length} bills / ${list.length} बिल तैयार किए गए`,
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to generate bills / बिल बनाने में विफल",
        text:
          err.message ||
          "Could not connect to database / डेटाबेस से कनेक्ट नहीं हो सका",
      });
    }
  };

  const handleAddCustomer = async () => {
    const name = newLaundryName.trim();
    if (!name) {
      Swal.fire({
        icon: "warning",
        title: "Missing Name / नाम गायब है",
        text: "Please enter customer name / कृपया ग्राहक का नाम दर्ज करें",
      });
      return;
    }
    try {
      await apiPost("/api/customers", { name });
      setNewLaundryName("");
      await loadBaseData();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Customer added / ग्राहक जुड़ गया",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to add customer / ग्राहक जोड़ने में विफल",
        text:
          err.message ||
          "Could not connect to database / डेटाबेस से कनेक्ट नहीं हो सका",
      });
    }
  };

  const handleDeleteCustomer = async (id) => {
    const result = await Swal.fire({
      title: "Delete Customer / ग्राहक हटाएं?",
      text: "सभी संबंधित एंट्री प्रभावित हो सकती हैं",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    await apiDelete(`/api/customers/${id}`);
    if (entryLaundry === id) setEntryLaundry("");
    if (billLaundry === id) setBillLaundry("");
    await loadBaseData();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Deleted successfully / हट गया",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const handleSaveCommon = async () => {
    await apiPut("/api/common", {
      label: "Common",
      rate: Number(commonForm.rate || 0),
    });
    await loadBaseData();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Common rate saved / सामान्य रेट सेव हो गया",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const handleAddItem = async () => {
    if (!newItem.en.trim() || !newItem.hi.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields / क्षेत्र अपूर्ण हैं",
        text: "Please enter both English and Hindi names / कृपया अंग्रेजी और हिंदी दोनों नाम दर्ज करें",
      });
      return;
    }
    try {
      await apiPost("/api/rates", {
        en: newItem.en.trim(),
        hi: newItem.hi.trim(),
        rate: Number(newItem.rate || 0),
      });
      setNewItem({ en: "", hi: "", rate: "" });
      await loadBaseData();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Item added / आइटम जुड़ गया",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to add item / आइटम जोड़ने में विफल",
        text:
          err.message ||
          "Could not connect to database / डेटाबेस से कनेक्ट नहीं हो सका",
      });
    }
  };

  const handleDeleteItem = async (id) => {
    const result = await Swal.fire({
      title: "Delete Item / आइटम हटाएं?",
      text: "यह आइटम रेट लिस्ट से हट जाएगा",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    await apiDelete(`/api/rates/${id}`);
    await loadBaseData();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Deleted successfully / हट गया",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };

  const handleDeleteEntry = async (entryId) => {
    const result = await Swal.fire({
      title: "Delete this entry?",
      text: "यह एंट्री डिलीट हो जाएगी",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    await apiDelete(`/api/entries/${entryId}`);
    if (selectedCustomerId) {
      const data = await fetchEntries({ laundryId: selectedCustomerId });
      setCustomerEntries(data);
    }
    if (view === "entries") {
      await loadAllEntries();
    }
    await loadStats();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Entry deleted / एंट्री डिलीट हो गई",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  };
  const openEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditDate(entry.date);
    setEditCommonQty(entry.commonQty || 0);
    const itemsObj = {};
    Object.entries(entry.items || {}).forEach(([id, qty]) => {
      itemsObj[id] = qty;
    });
    setEditItemQtys(itemsObj);
    setEditSpecialSearch("");
  };

  const closeEditEntry = () => {
    setEditingEntry(null);
    setEditDate("");
    setEditCommonQty(0);
    setEditItemQtys({});
    setEditSpecialSearch("");
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    const items = {};
    Object.entries(editItemQtys).forEach(([id, qty]) => {
      if (Number(qty) > 0) items[id] = Number(qty);
    });
    try {
      await apiPut(`/api/entries/${editingEntry._id}`, {
        laundryId: editingEntry.laundryId,
        date: editDate,
        commonQty: Number(editCommonQty || 0),
        items,
      });
      closeEditEntry();
      if (selectedCustomerId) {
        const data = await fetchEntries({ laundryId: selectedCustomerId });
        setCustomerEntries(data);
      }
      if (view === "entries") {
        await loadAllEntries();
      }
      await loadStats();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Entry updated / एंट्री अपडेट हो गई",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (err) {
      if (err?.status === 409) {
        Swal.fire({
          icon: "error",
          title: "Only one entry allowed",
          text: "इस ग्राहक के लिए इस तारीख पर पहले से एंट्री है",
        });
        return;
      }
      Swal.fire({
        icon: "error",
        title: "Could not update entry",
        text: "एंट्री अपडेट नहीं हुई",
      });
    }
  };
  const clearZeroOnFocus = (value, setter) => {
    if (String(value) === "0") setter("");
  };

  const restoreZeroOnBlur = (value, setter) => {
    if (value === "" || value === null || typeof value === "undefined")
      setter(0);
  };

  const fetchEntries = async ({ laundryId, month }) => {
    const params = new URLSearchParams();
    if (laundryId) params.set("laundryId", laundryId);
    if (month) params.set("month", month);
    const data = await apiGet(`/api/entries?${params.toString()}`);
    return data;
  };

  const openCustomerEntries = async (customerId) => {
    setSelectedCustomerId(customerId);
    const data = await fetchEntries({ laundryId: customerId });
    setCustomerEntries(data);
    setView("customerEntries");
  };

  const loadAllEntries = async () => {
    if (!entriesMonth) return;
    const data = await fetchEntries({ month: entriesMonth });
    setAllEntries(data);
  };

  const loadSummaryData = async () => {
    if (!summaryMonth) return;
    const data = await fetchEntries({ month: summaryMonth });
    setSummaryEntries(data);
  };

  useEffect(() => {
    if (view === "summary" && summaryMonth) {
      loadSummaryData();
    }
  }, [view, summaryMonth]);

  const loadLedgerData = async () => {
    if (!ledgerMonth) return;
    const data = await fetchEntries({ month: ledgerMonth });
    setLedgerEntries(data);
  };

  useEffect(() => {
    if (view === "ledger" && ledgerMonth) {
      loadLedgerData();
    }
  }, [view, ledgerMonth]);

  const handlePrintLedger = () => {
    const style = document.createElement("style");
    style.id = "ledger-print-style";
    style.innerHTML =
      "@page { size: landscape; margin: 0 !important; } body { margin: 0.5cm !important; }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("ledger-print-style");
      if (el) el.remove();
    }, 1000);
  };

  const handlePrintSingleBill = () => {
    const style = document.createElement("style");
    style.id = "portrait-print-style";
    style.innerHTML =
      "@page { size: portrait; margin: 0 !important; } body { margin: 0.4in !important; }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("portrait-print-style");
      if (el) el.remove();
    }, 1000);
  };

  const handlePrintAllBills = () => {
    const style = document.createElement("style");
    style.id = "landscape-print-style";
    style.innerHTML =
      "@page { size: landscape; margin: 0 !important; } body { margin: 0.4in !important; }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("landscape-print-style");
      if (el) el.remove();
    }, 1000);
  };

  const formatMonthBill = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const monthsEn = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthsHi = [
      "जनवरी",
      "फरवरी",
      "मार्च",
      "अप्रैल",
      "मई",
      "जून",
      "जुलाई",
      "अगस्त",
      "सितंबर",
      "अक्टूबर",
      "नवंबर",
      "दिसंबर",
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthsEn[idx]} ${year} / ${monthsHi[idx]} ${year}`;
  };

  const formatMonthOnly = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const monthsEn = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthsHi = [
      "जनवरी",
      "फरवरी",
      "मार्च",
      "अप्रैल",
      "मई",
      "जून",
      "जुलाई",
      "अगस्त",
      "सितंबर",
      "अक्टूबर",
      "नवंबर",
      "दिसंबर",
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthsEn[idx].toUpperCase()} ( ${monthsHi[idx]} ${year} )`;
  };

  const formatEntryItems = (entry) => {
    const items = [];
    if (Number(entry.commonQty || 0) > 0) {
      items.push(`Common x ${entry.commonQty}`);
    }
    Object.entries(entry.items || {}).forEach(([id, qty]) => {
      const item = rates.find((r) => r._id === id);
      if (item && Number(qty) > 0) {
        items.push(`${item.en} (${item.hi}) x ${qty}`);
      }
    });
    return items;
  };

  const groupByDate = (entries) => {
    const grouped = {};
    entries.forEach((e) => {
      grouped[e.date] = grouped[e.date] || [];
      grouped[e.date].push(e);
    });
    return grouped;
  };

  // Helper selectors for live running totals
  const calculateRunningTotal = () => {
    let total = Number(commonQty || 0) * Number(common?.rate || 0);
    Object.entries(itemQtys).forEach(([id, qty]) => {
      const item = rates.find((r) => r._id === id);
      if (item && Number(qty) > 0) {
        total += Number(qty) * Number(item.rate || 0);
      }
    });
    return total;
  };

  const countTotalItems = () => {
    let count = Number(commonQty || 0);
    Object.values(itemQtys).forEach((qty) => {
      if (Number(qty) > 0) count += Number(qty);
    });
    return count;
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="title">OM GANESHAY NAMAH</div>
        <div className="subtitle">Laundry Billing / लॉन्ड्री बिलिंग</div>
      </header>

      <nav className="tabs">
        {[
          {
            key: "entry",
            label: "New Entry / एंट्री",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            ),
          },
          {
            key: "bill",
            label: "Bill / बिल",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            ),
          },
          {
            key: "summary",
            label: "Summary / सारांश",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            ),
          },
          {
            key: "ledger",
            label: "Ledger / बहीखाता",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
            ),
          },
          {
            key: "customers",
            label: "Customers / ग्राहक",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            ),
          },
          {
            key: "rates",
            label: "Rates / रेट",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            ),
          },
          {
            key: "entries",
            label: "Entries / सभी एंट्री",
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ),
          },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${view === t.key ? "active" : ""}`}
            onClick={() => setView(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {view === "entry" && (
        <section className="card">
          <div className="card-title">New Entry / नई एंट्री</div>

          <label className="label">Laundry / लॉन्ड्री (type to search)</label>
          <SearchableSelect
            items={customers}
            selectedId={entryLaundry}
            onChange={(id) => setEntryLaundry(id)}
            placeholder="Search customer... / ग्राहक खोजें..."
          />

          <label className="label">Entry Date / एंट्री तारीख</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />

          <div className="divider" />

          <div className="group-box">
            <div className="group-title">Common Items / सामान्य कपड़े</div>
            <div className="qty-row">
              <button
                className="qty-btn"
                onClick={() => setCommonQty(Math.max(0, Number(commonQty) - 1))}
              >
                -
              </button>
              <input
                type="number"
                min="0"
                value={commonQty}
                onFocus={() => clearZeroOnFocus(commonQty, setCommonQty)}
                onBlur={() => restoreZeroOnBlur(commonQty, setCommonQty)}
                onChange={(e) => setCommonQty(e.target.value)}
              />
              <button
                className="qty-btn"
                onClick={() => setCommonQty(Number(commonQty) + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="divider" />

          <label className="label">
            Search Special Item / विशेष कपड़ा खोजें
          </label>
          <input
            placeholder="Type item name / नाम लिखें..."
            value={specialSearch}
            onChange={(e) => setSpecialSearch(e.target.value)}
            onFocus={() => setSpecialSearch("")}
          />

          <div className="items-list">
            {rates
              .filter((item) =>
                `${item.en} ${item.hi}`
                  .toLowerCase()
                  .includes(specialSearch.toLowerCase()),
              )
              .map((item) => {
                const qty = itemQtys[item._id] ?? 0;
                const hasQty = Number(qty) > 0;
                return (
                  <div
                    className={`item-row ${hasQty ? "has-qty" : ""}`}
                    key={item._id}
                  >
                    <div>
                      <div className="item-name">
                        {item.en} ({item.hi})
                      </div>
                      <div className="item-rate">Rate: {money(item.rate)}</div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={qty}
                      onFocus={() =>
                        clearZeroOnFocus(qty, (v) =>
                          setItemQtys((prev) => ({ ...prev, [item._id]: v })),
                        )
                      }
                      onBlur={() =>
                        restoreZeroOnBlur(qty, (v) =>
                          setItemQtys((prev) => ({ ...prev, [item._id]: v })),
                        )
                      }
                      onChange={(e) =>
                        setItemQtys((prev) => ({
                          ...prev,
                          [item._id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}
          </div>

          <div className="divider" />

          {/* Running Subtotal display */}
          <div className="running-total-bar">
            <span className="running-total-label">Running Total / कुल:</span>
            <span className="running-total-val">
              {money(calculateRunningTotal())} ({countTotalItems()} items)
            </span>
          </div>

          <div className="sticky-save">
            <button className="primary full" onClick={handleAddEntry}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Entry / सेव करें
            </button>
          </div>
        </section>
      )}

      {view === "bill" && (
        <section className="card">
          <div className="card-title">Monthly Bill / मासिक बिल</div>

          <label className="label">Laundry / लॉन्ड्री (type to search)</label>
          <SearchableSelect
            items={customers}
            selectedId={billLaundry}
            onChange={(id) => setBillLaundry(id)}
            placeholder="Search customer... / ग्राहक खोजें..."
          />

          <label className="label">Month / महीना</label>
          <input
            type="month"
            value={billMonth}
            onChange={(e) => setBillMonth(e.target.value)}
          />

          <div className="button-grid">
            <button className="primary" onClick={handleGenerateBill}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              One Customer / एक ग्राहक
            </button>
            <button className="secondary" onClick={handleGenerateAllBills}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              All Customers / सभी एक साथ
            </button>
          </div>

          {billMode === "single" && bill && (
            <div className="receipt-card">
              <div
                className="bill-header"
                style={{
                  borderBottom: "none",
                  marginBottom: "5px",
                  paddingBottom: "0",
                }}
              >
                <div
                  className="bill-title"
                  style={{
                    fontSize: "13px",
                    letterSpacing: "1px",
                    fontWeight: "bold",
                  }}
                >
                  OM GANESHAY NAMAH
                </div>
              </div>

              <div
                className="bill-meta-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderBottom: "2px solid black",
                  paddingBottom: "5px",
                  marginBottom: "8px",
                }}
              >
                <div
                  className="bill-meta-title"
                  style={{ fontSize: "13px", fontWeight: "800", color: "#000" }}
                >
                  {bill.customer} {bill.customerHi && `(${bill.customerHi})`}
                </div>
                <div
                  className="bill-meta-title"
                  style={{ fontSize: "12px", fontWeight: "800", color: "#000" }}
                >
                  {formatMonthOnly(bill.month)}
                </div>
              </div>

              <div className="bill-table">
                {bill.rows.map((r, i) => (
                  <div className="bill-row" key={`${r.name}-${i}`}>
                    <div>{r.name}</div>
                    <div>Qty: {r.qty}</div>
                    <div>{money(r.amount)}</div>
                  </div>
                ))}
              </div>
              <div
                className="bill-total"
                style={{
                  borderTop: "2px solid black",
                  marginTop: "10px",
                  paddingTop: "6px",
                  textAlign: "right",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Total / कुल: {money(bill.totalAmount)}
              </div>
              <button
                className="secondary full"
                onClick={handlePrintSingleBill}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Receipt / प्रिंट करें
              </button>
            </div>
          )}

          {billMode === "all" && billsList.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="no-print" style={{ marginBottom: 12 }}>
                <button className="primary full" onClick={handlePrintAllBills}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print All Bills ({billsList.length}) / सभी प्रिंट करें
                </button>
              </div>

              <div className="all-bills-print-container">
                {(() => {
                  const pairs = [];
                  for (let i = 0; i < billsList.length; i += 2) {
                    pairs.push(billsList.slice(i, i + 2));
                  }
                  return pairs.map((pair, pageIdx) => (
                    <div
                      className="bill-print-page"
                      key={`bill-page-${pageIdx}`}
                      style={{
                        pageBreakAfter:
                          pageIdx < pairs.length - 1 ? "always" : "avoid",
                        breakAfter:
                          pageIdx < pairs.length - 1 ? "page" : "avoid",
                      }}
                    >
                      {pair[0] && (
                        <div className="receipt-card">
                          <div
                            className="bill-header"
                            style={{
                              borderBottom: "none",
                              marginBottom: "5px",
                              paddingBottom: "0",
                            }}
                          >
                            <div
                              className="bill-title"
                              style={{
                                fontSize: "13px",
                                letterSpacing: "1px",
                                fontWeight: "bold",
                              }}
                            >
                              OM GANESHAY NAMAH
                            </div>
                          </div>

                          <div
                            className="bill-meta-row"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              borderBottom: "2px solid black",
                              paddingBottom: "5px",
                              marginBottom: "8px",
                            }}
                          >
                            <div
                              className="bill-meta-title"
                              style={{
                                fontSize: "13px",
                                fontWeight: "800",
                                color: "#000",
                              }}
                            >
                              {pair[0].customer}{" "}
                              {pair[0].customerHi && `(${pair[0].customerHi})`}
                            </div>
                            <div
                              className="bill-meta-title"
                              style={{
                                fontSize: "12px",
                                fontWeight: "800",
                                color: "#000",
                              }}
                            >
                              {formatMonthOnly(pair[0].month)}
                            </div>
                          </div>

                          <div className="bill-table">
                            {pair[0].rows.map((r, i) => (
                              <div className="bill-row" key={`${r.name}-${i}`}>
                                <div>{r.name}</div>
                                <div>Qty: {r.qty}</div>
                                <div>{money(r.amount)}</div>
                              </div>
                            ))}
                          </div>
                          <div
                            className="bill-total"
                            style={{
                              borderTop: "2px solid black",
                              marginTop: "10px",
                              paddingTop: "6px",
                              textAlign: "right",
                              fontSize: "13px",
                              fontWeight: "bold",
                            }}
                          >
                            Total / कुल: {money(pair[0].totalAmount)}
                          </div>
                        </div>
                      )}

                      {pair.length === 2 && (
                        <div
                          className="print-vertical-cut-line"
                          style={{
                            borderLeft: "1.5px dashed var(--ink)",
                            margin: "0 15px",
                            position: "relative",
                            alignSelf: "stretch",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "10%",
                              left: "-8px",
                              fontSize: "12px",
                            }}
                          >
                            ✂️
                          </span>
                          <span
                            style={{
                              position: "absolute",
                              bottom: "10%",
                              left: "-8px",
                              fontSize: "12px",
                            }}
                          >
                            ✂️
                          </span>
                        </div>
                      )}

                      {pair[1] && (
                        <div className="receipt-card">
                          <div
                            className="bill-header"
                            style={{
                              borderBottom: "none",
                              marginBottom: "5px",
                              paddingBottom: "0",
                            }}
                          >
                            <div
                              className="bill-title"
                              style={{
                                fontSize: "13px",
                                letterSpacing: "1px",
                                fontWeight: "bold",
                              }}
                            >
                              OM GANESHAY NAMAH
                            </div>
                          </div>

                          <div
                            className="bill-meta-row"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              borderBottom: "2px solid black",
                              paddingBottom: "5px",
                              marginBottom: "8px",
                            }}
                          >
                            <div
                              className="bill-meta-title"
                              style={{
                                fontSize: "13px",
                                fontWeight: "800",
                                color: "#000",
                              }}
                            >
                              {pair[1].customer}{" "}
                              {pair[1].customerHi && `(${pair[1].customerHi})`}
                            </div>
                            <div
                              className="bill-meta-title"
                              style={{
                                fontSize: "12px",
                                fontWeight: "800",
                                color: "#000",
                              }}
                            >
                              {formatMonthOnly(pair[1].month)}
                            </div>
                          </div>

                          <div className="bill-table">
                            {pair[1].rows.map((r, i) => (
                              <div className="bill-row" key={`${r.name}-${i}`}>
                                <div>{r.name}</div>
                                <div>Qty: {r.qty}</div>
                                <div>{money(r.amount)}</div>
                              </div>
                            ))}
                          </div>
                          <div
                            className="bill-total"
                            style={{
                              borderTop: "2px solid black",
                              marginTop: "10px",
                              paddingTop: "6px",
                              textAlign: "right",
                              fontSize: "13px",
                              fontWeight: "bold",
                            }}
                          >
                            Total / कुल: {money(pair[1].totalAmount)}
                          </div>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </section>
      )}

      {view === "summary" && (
        <section className="card">
          <div className="card-title">Monthly Summary / मासिक सारांश</div>
          <label className="label">Month / महीना</label>
          <input
            type="month"
            value={summaryMonth}
            onChange={(e) => setSummaryMonth(e.target.value)}
          />

          <div className="button-grid" style={{ marginBottom: 16 }}>
            <button className="primary" onClick={loadSummaryData}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Load / देखें
            </button>
            <button className="secondary" onClick={() => window.print()}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / प्रिंट
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              className="summary-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      fontSize: 13,
                    }}
                  >
                    Shop Name / दुकान का नाम
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 8px",
                      fontSize: 13,
                    }}
                  >
                    Total Rupees / कुल रुपये
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const custEntries = summaryEntries.filter(
                    (e) => e.laundryId === customer._id,
                  );
                  const total = custEntries.reduce(
                    (sum, e) => sum + calcAmount(e, rates, common?.rate),
                    0,
                  );
                  return (
                    <tr
                      key={`summary-${customer._id}`}
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      <td
                        style={{
                          padding: "10px 8px",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {customer.name}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: 13,
                          color: total > 0 ? "var(--primary)" : "var(--muted)",
                        }}
                      >
                        {money(total)}
                      </td>
                    </tr>
                  );
                })}
                <tr
                  style={{
                    borderTop: "2px solid var(--ink)",
                    background: "var(--bg)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 8px",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    Grand Total / कुल जोड़
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "right",
                      fontWeight: 800,
                      fontSize: 14,
                      color: "var(--success)",
                    }}
                  >
                    {money(
                      customers.reduce((grandSum, customer) => {
                        const custEntries = summaryEntries.filter(
                          (e) => e.laundryId === customer._id,
                        );
                        return (
                          grandSum +
                          custEntries.reduce(
                            (sum, e) =>
                              sum + calcAmount(e, rates, common?.rate),
                            0,
                          )
                        );
                      }, 0),
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Print Area for Summary Sheet */}
          <div className="print-area">
            <div className="print-header">
              <div className="print-title">Monthly Business Summary Sheet</div>
              <div className="print-sub">Month: {summaryMonth}</div>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid black",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f1f5f9",
                    borderBottom: "1px solid black",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px",
                      fontSize: "11px",
                      borderRight: "1px solid black",
                    }}
                  >
                    Shop Name / दुकान का नाम
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px",
                      fontSize: "11px",
                    }}
                  >
                    Total Amount / कुल राशि
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const custEntries = summaryEntries.filter(
                    (e) => e.laundryId === customer._id,
                  );
                  const total = custEntries.reduce(
                    (sum, e) => sum + calcAmount(e, rates, common?.rate),
                    0,
                  );
                  return (
                    <tr
                      key={`print-summary-${customer._id}`}
                      style={{ borderBottom: "1px solid black" }}
                    >
                      <td
                        style={{
                          padding: "8px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          borderRight: "1px solid black",
                        }}
                      >
                        {customer.name}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontSize: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {money(total)}
                      </td>
                    </tr>
                  );
                })}
                <tr
                  style={{
                    background: "#e2e8f0",
                    borderTop: "2px solid black",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 8px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      borderRight: "1px solid black",
                    }}
                  >
                    Grand Total / कुल जोड़
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      textAlign: "right",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  >
                    {money(
                      customers.reduce((grandSum, customer) => {
                        const custEntries = summaryEntries.filter(
                          (e) => e.laundryId === customer._id,
                        );
                        return (
                          grandSum +
                          custEntries.reduce(
                            (sum, e) =>
                              sum + calcAmount(e, rates, common?.rate),
                            0,
                          )
                        );
                      }, 0),
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "ledger" && (
        <section
          className="card"
          style={{ maxWidth: "100%", overflow: "hidden" }}
        >
          <div className="card-title">
            Monthly Ledger Sheet / मासिक बहीखाता ग्रिड
          </div>
          <label className="label">Month / महीना</label>
          <input
            type="month"
            value={ledgerMonth}
            onChange={(e) => setLedgerMonth(e.target.value)}
          />

          <div className="button-grid" style={{ marginBottom: 16 }}>
            <button className="primary" onClick={loadLedgerData}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Load / देखें
            </button>
            <button className="secondary" onClick={handlePrintLedger}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / प्रिंट (Landscape)
            </button>
          </div>

          <div className="ledger-table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Item Name / आइटम</th>
                  {customers.map((c) => (
                    <th key={`head-${c._id}`}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="ledger-row-common">
                  <td>Common Cloth / सामान्य</td>
                  {customers.map((customer) => {
                    const custEntries = ledgerEntries.filter(
                      (e) => e.laundryId === customer._id,
                    );
                    const totalCommon = custEntries.reduce(
                      (sum, e) => sum + Number(e.commonQty || 0),
                      0,
                    );
                    return (
                      <td key={`common-val-${customer._id}`}>
                        {totalCommon > 0 ? totalCommon : "-"}
                      </td>
                    );
                  })}
                </tr>

                {rates.map((item) => (
                  <tr key={`ledger-row-item-${item._id}`}>
                    <td>
                      {item.en} ({item.hi})
                    </td>
                    {customers.map((customer) => {
                      const custEntries = ledgerEntries.filter(
                        (e) => e.laundryId === customer._id,
                      );
                      const totalItem = custEntries.reduce((sum, e) => {
                        const qty = e.items ? e.items[item._id] || 0 : 0;
                        return sum + Number(qty || 0);
                      }, 0);
                      return (
                        <td key={`item-val-${item._id}-${customer._id}`}>
                          {totalItem > 0 ? totalItem : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr
                  className="ledger-row-total"
                  style={{
                    borderTop: "2px solid var(--ink)",
                    background: "var(--bg)",
                  }}
                >
                  <td style={{ fontWeight: "bold" }}>
                    Total Rupees / कुल रुपये
                  </td>
                  {customers.map((customer) => {
                    const custEntries = ledgerEntries.filter(
                      (e) => e.laundryId === customer._id,
                    );
                    const totalAmt = custEntries.reduce(
                      (sum, e) => sum + calcAmount(e, rates, common?.rate),
                      0,
                    );
                    return (
                      <td
                        key={`total-val-${customer._id}`}
                        style={{ fontWeight: 800, color: "var(--primary)" }}
                      >
                        {totalAmt > 0 ? money(totalAmt) : "-"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Print-only split tables to avoid cutting off columns */}
          <div className="print-area ledger-print-only">
            {(() => {
              const chunks = [];
              const chunkSize = 9;
              for (let i = 0; i < customers.length; i += chunkSize) {
                chunks.push(customers.slice(i, i + chunkSize));
              }
              return chunks.map((customerChunk, chunkIdx) => (
                <div
                  className="ledger-print-page"
                  key={`print-chunk-${chunkIdx}`}
                  style={{
                    pageBreakAfter:
                      chunkIdx < chunks.length - 1 ? "always" : "avoid",
                    breakAfter: chunkIdx < chunks.length - 1 ? "page" : "avoid",
                    marginTop: chunkIdx > 0 ? "20px" : "0px",
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <h2
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      OM GANESHAY NAMAH
                    </h2>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      Monthly Ledger Sheet - Month: {ledgerMonth} (Part{" "}
                      {chunkIdx + 1} of {chunks.length})
                    </h3>
                  </div>

                  <table
                    className="ledger-table print-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid black",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#f1f5f9",
                          borderBottom: "2px solid black",
                        }}
                      >
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px",
                            fontSize: "9px",
                            borderRight: "1px solid black",
                            width: "120px",
                          }}
                        >
                          Item Name / आइटम
                        </th>
                        {customerChunk.map((c) => (
                          <th
                            key={`print-head-${c._id}`}
                            style={{
                              padding: "6px",
                              fontSize: "9px",
                              borderRight: "1px solid black",
                              textAlign: "center",
                            }}
                          >
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Common Cloth */}
                      <tr style={{ borderBottom: "1px solid black" }}>
                        <td
                          style={{
                            padding: "6px",
                            fontSize: "8px",
                            fontWeight: "bold",
                            borderRight: "1px solid black",
                          }}
                        >
                          Common Cloth / सामान्य
                        </td>
                        {customerChunk.map((customer) => {
                          const custEntries = ledgerEntries.filter(
                            (e) => e.laundryId === customer._id,
                          );
                          const totalCommon = custEntries.reduce(
                            (sum, e) => sum + Number(e.commonQty || 0),
                            0,
                          );
                          return (
                            <td
                              key={`print-common-${customer._id}`}
                              style={{
                                padding: "6px",
                                fontSize: "8px",
                                borderRight: "1px solid black",
                                textAlign: "center",
                              }}
                            >
                              {totalCommon > 0 ? totalCommon : "-"}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Special Items */}
                      {rates.map((item) => (
                        <tr
                          key={`print-item-row-${item._id}`}
                          style={{ borderBottom: "1px solid black" }}
                        >
                          <td
                            style={{
                              padding: "6px",
                              fontSize: "8px",
                              borderRight: "1px solid black",
                            }}
                          >
                            {item.en} ({item.hi})
                          </td>
                          {customerChunk.map((customer) => {
                            const custEntries = ledgerEntries.filter(
                              (e) => e.laundryId === customer._id,
                            );
                            const totalItem = custEntries.reduce((sum, e) => {
                              const qty = e.items ? e.items[item._id] || 0 : 0;
                              return sum + Number(qty || 0);
                            }, 0);
                            return (
                              <td
                                key={`print-item-val-${item._id}-${customer._id}`}
                                style={{
                                  padding: "6px",
                                  fontSize: "8px",
                                  borderRight: "1px solid black",
                                  textAlign: "center",
                                }}
                              >
                                {totalItem > 0 ? totalItem : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Total Rupees */}
                      <tr
                        style={{
                          background: "#e2e8f0",
                          borderTop: "2px solid black",
                          fontWeight: "bold",
                        }}
                      >
                        <td
                          style={{
                            padding: "8px 6px",
                            fontSize: "9px",
                            borderRight: "1px solid black",
                          }}
                        >
                          Total Rupees / कुल रुपये
                        </td>
                        {customerChunk.map((customer) => {
                          const custEntries = ledgerEntries.filter(
                            (e) => e.laundryId === customer._id,
                          );
                          const totalAmt = custEntries.reduce(
                            (sum, e) =>
                              sum + calcAmount(e, rates, common?.rate),
                            0,
                          );
                          return (
                            <td
                              key={`print-total-val-${customer._id}`}
                              style={{
                                padding: "8px 6px",
                                fontSize: "9px",
                                borderRight: "1px solid black",
                                textAlign: "center",
                                color: "#000",
                              }}
                            >
                              {totalAmt > 0 ? totalAmt.toFixed(0) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {view === "customers" && (
        <section className="card">
          <div className="card-title">Customers / ग्राहक</div>

          <label className="label">Search Customer / ग्राहक खोजें</label>
          <input
            placeholder="Type name / नाम लिखें..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />

          <div style={{ marginTop: 12 }}>
            {customers
              .filter((c) =>
                c.name.toLowerCase().includes(customerSearch.toLowerCase()),
              )
              .map((c) => (
                <div className="customer-row" key={c._id}>
                  <div className="customer-name">{c.name}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="small-btn"
                      onClick={() => openCustomerEntries(c._id)}
                    >
                      Entries
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => handleDeleteCustomer(c._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="divider" />

          <label className="label">Add New Customer / नया ग्राहक जोड़ें</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={newLaundryName}
              onChange={(e) => setNewLaundryName(e.target.value)}
              placeholder="Enter name / नाम लिखें..."
            />
            <button
              className="primary"
              style={{ flexShrink: 0, padding: "12px 20px" }}
              onClick={handleAddCustomer}
            >
              Add / जोड़ें
            </button>
          </div>
        </section>
      )}

      {view === "rates" && (
        <section className="card">
          <div className="card-title">Rates / रेट</div>

          <div
            className="group-box"
            style={{
              background: "#f8fafc",
              border: "1px solid var(--line)",
              marginBottom: 20,
            }}
          >
            <div className="group-title" style={{ color: "var(--primary)" }}>
              Common Item Rate / सामान्य रेट
            </div>
            <label className="label">Label / नाम</label>
            <input value={commonForm.label} disabled />

            <label className="label">Rate / रेट (₹)</label>
            <input
              type="number"
              min="0"
              value={commonForm.rate}
              onFocus={() =>
                clearZeroOnFocus(commonForm.rate, (v) =>
                  setCommonForm((prev) => ({ ...prev, rate: v })),
                )
              }
              onBlur={() =>
                restoreZeroOnBlur(commonForm.rate, (v) =>
                  setCommonForm((prev) => ({ ...prev, rate: v })),
                )
              }
              onChange={(e) =>
                setCommonForm({ ...commonForm, rate: e.target.value })
              }
            />
            <button
              className="primary full"
              style={{ marginTop: 12 }}
              onClick={handleSaveCommon}
            >
              Save Common Rate / सेव करें
            </button>
          </div>

          <div className="divider" />

          <div className="card-title">Special Items / विशेष कपड़े</div>
          {rates.map((item) => (
            <div className="rate-row" key={item._id}>
              <div>
                <span className="customer-name">
                  {item.en} ({item.hi})
                </span>
                <div
                  style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}
                >
                  Rate: {money(item.rate)}
                </div>
              </div>
              <button
                className="danger-btn"
                onClick={() => handleDeleteItem(item._id)}
              >
                Delete
              </button>
            </div>
          ))}

          <div className="divider" />

          <div
            className="group-box"
            style={{ background: "#f8fafc", border: "1px solid var(--line)" }}
          >
            <div className="group-title" style={{ color: "var(--primary)" }}>
              Add Special Item / नया विशेष कपड़ा
            </div>

            <label className="label">English Name</label>
            <input
              placeholder="e.g. Jeans"
              value={newItem.en}
              onChange={(e) => setNewItem({ ...newItem, en: e.target.value })}
              onBlur={async (e) => {
                const val = e.target.value.trim();
                if (val && !newItem.hi.trim()) {
                  try {
                    const res = await fetch(
                      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(val)}`,
                    );
                    if (res.ok) {
                      const data = await res.json();
                      const translated = data[0][0][0] || "";
                      setNewItem((prev) => ({ ...prev, hi: translated }));
                    }
                  } catch (err) {
                    console.error("Auto translation error", err);
                  }
                }
              }}
            />

            <label className="label">Hindi Name</label>
            <input
              placeholder="जैसे. जीन्स"
              value={newItem.hi}
              onChange={(e) => setNewItem({ ...newItem, hi: e.target.value })}
            />

            <label className="label">Rate / रेट (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={newItem.rate}
              onFocus={() =>
                clearZeroOnFocus(newItem.rate ?? 0, (v) =>
                  setNewItem((prev) => ({ ...prev, rate: v })),
                )
              }
              onBlur={() =>
                restoreZeroOnBlur(newItem.rate, (v) =>
                  setNewItem((prev) => ({ ...prev, rate: v })),
                )
              }
              onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
            />

            <button
              className="primary full"
              style={{ marginTop: 16 }}
              onClick={handleAddItem}
            >
              Add Special Item / जोड़ें
            </button>
          </div>
        </section>
      )}

      {view === "entries" && (
        <section className="card">
          <div className="card-title">All Entries / सभी एंट्री</div>

          <label className="label">Month / महीना</label>
          <input
            type="month"
            value={entriesMonth}
            onChange={(e) => setEntriesMonth(e.target.value)}
          />

          <div className="button-grid">
            <button className="primary" onClick={loadAllEntries}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Load / देखें
            </button>
            <button className="secondary" onClick={() => window.print()}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / प्रिंट
            </button>
          </div>

          {allEntries.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <label className="label">Search (customer/item) / खोजें</label>
              <input
                placeholder="Type name or item..."
                value={daySearch}
                onChange={(e) => setDaySearch(e.target.value)}
              />

              <div style={{ marginTop: 16 }}>
                {Object.entries(groupByDate(allEntries))
                  .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                  .map(([date, entries]) => {
                    const dayTotal = entries.reduce(
                      (sum, e) => sum + calcAmount(e, rates, common?.rate),
                      0,
                    );
                    const isOpen = !!expandedDates[date];
                    return (
                      <div key={date} className="day-block">
                        <button
                          className="day-summary"
                          onClick={() =>
                            setExpandedDates((prev) => ({
                              ...prev,
                              [date]: !prev[date],
                            }))
                          }
                        >
                          <div className="day-left">
                            <div className="day-date">{date}</div>
                            <div className="day-meta">
                              {entries.length} entries
                            </div>
                          </div>
                          <div
                            className="day-right"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>{money(dayTotal)}</span>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                transform: isOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s",
                                color: "var(--muted)",
                              }}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="day-entries">
                            {entries
                              .map((e) => {
                                const customer = customers.find(
                                  (c) => c._id === e.laundryId,
                                );
                                const items = formatEntryItems(e).join(", ");
                                const haystack =
                                  `${customer?.name || ""} ${items}`.toLowerCase();
                                if (
                                  daySearch &&
                                  !haystack.includes(daySearch.toLowerCase())
                                ) {
                                  return null;
                                }
                                return (
                                  <div key={e._id} className="entry-row">
                                    <div className="entry-main">
                                      <div className="entry-name">
                                        {customer?.name || "Customer"}
                                      </div>
                                      <div className="entry-items">
                                        {items || "-"}
                                      </div>
                                    </div>
                                    <div className="entry-amount">
                                      {money(
                                        calcAmount(e, rates, common?.rate),
                                      )}
                                    </div>
                                    <button
                                      className="small-btn"
                                      style={{
                                        padding: "6px 10px",
                                        fontSize: 11,
                                      }}
                                      onClick={() => openEditEntry(e)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="danger-btn"
                                      style={{
                                        padding: "6px 10px",
                                        fontSize: 11,
                                      }}
                                      onClick={() => handleDeleteEntry(e._id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                );
                              })
                              .filter(Boolean)}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {allEntries.length > 0 && (
            <div className="print-area">
              <div className="print-header">
                <div className="print-title">All Laundry Entries Log</div>
                <div className="print-sub">Month: {entriesMonth}</div>
              </div>

              <div className="print-days-container">
                {Object.entries(groupByDate(allEntries))
                  .sort((a, b) => (a[0] > b[0] ? 1 : -1))
                  .map(([date, entries]) => {
                    const dayTotal = entries.reduce(
                      (sum, e) => sum + calcAmount(e, rates, common?.rate),
                      0,
                    );

                    // Format date to "D MMM" (e.g., "30 Jun")
                    let dateStr = date;
                    try {
                      const d = new Date(date);
                      const day = d.getDate();
                      const months = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ];
                      dateStr = `${day} ${months[d.getMonth()]}`;
                    } catch (err) {}

                    return (
                      <div key={`print-${date}`} className="print-day">
                        <div className="print-day-title">
                          <span>{dateStr}</span>
                          <span>Total: {money(dayTotal)}</span>
                        </div>
                        <div className="print-day-entries">
                          {customers.map((customer) => {
                            // Find if this customer has an entry for this date
                            const e = entries.find(
                              (entry) => entry.laundryId === customer._id,
                            );

                            const items = [];
                            let amount = 0;
                            if (e) {
                              if (Number(e.commonQty || 0) > 0) {
                                items.push(`Common x ${e.commonQty}`);
                              }
                              Object.entries(e.items || {}).forEach(
                                ([id, qty]) => {
                                  const item = rates.find((r) => r._id === id);
                                  if (item && Number(qty) > 0) {
                                    items.push(`${item.en} x ${qty}`);
                                  }
                                },
                              );
                              amount = calcAmount(e, rates, common?.rate);
                            }

                            return (
                              <div
                                key={`print-row-${customer._id}-${date}`}
                                className="print-entry-row"
                              >
                                <span className="print-cust">
                                  {customer.name}
                                </span>
                                <span className="print-items">
                                  {items.length > 0 ? items.join(", ") : "-"}
                                </span>
                                <span className="print-amt">
                                  {amount > 0 ? money(amount) : "-"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      )}

      {view === "customerEntries" && (
        <section className="card">
          <div className="card-title">Customer Entries / ग्राहक एंट्री</div>
          <button
            className="secondary full"
            onClick={() => setView("customers")}
            style={{ marginBottom: 16 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back / वापस
          </button>

          <div>
            {Object.entries(groupByDate(customerEntries))
              .sort((a, b) => (a[0] < b[0] ? 1 : -1))
              .map(([date, entries]) => (
                <div
                  key={date}
                  className="card"
                  style={{ margin: "0 0 12px 0", padding: 14 }}
                >
                  <div
                    className="card-title"
                    style={{ fontSize: 14, marginBottom: 8 }}
                  >
                    {date}
                  </div>
                  {entries.map((e) => {
                    const items = formatEntryItems(e);
                    return (
                      <div key={e._id} style={{ marginBottom: 4 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--muted)",
                              flex: 1,
                              fontWeight: 500,
                            }}
                          >
                            {items.length ? items.join(", ") : "-"}
                          </div>
                          <div
                            style={{
                              fontWeight: "800",
                              marginRight: 10,
                              fontSize: 14,
                            }}
                          >
                            {money(calcAmount(e, rates, common?.rate))}
                          </div>
                          <button
                            className="small-btn"
                            style={{ padding: "6px 10px", fontSize: 11 }}
                            onClick={() => openEditEntry(e)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger-btn"
                            style={{ padding: "6px 10px", fontSize: 11 }}
                            onClick={() => handleDeleteEntry(e._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </section>
      )}
      {editingEntry && (
        <div className="modal-overlay" onClick={closeEditEntry}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-title">
              Edit Entry / एंट्री संपादित करें
              <span
                style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}
              >
                {customers.find((c) => c._id === editingEntry.laundryId)
                  ?.name || ""}
              </span>
            </div>

            <label className="label">Entry Date / एंट्री तारीख</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            <div className="divider" />

            <div className="group-box">
              <div className="group-title">Common Items / सामान्य कपड़े</div>
              <div className="qty-row">
                <button
                  className="qty-btn"
                  onClick={() =>
                    setEditCommonQty(Math.max(0, Number(editCommonQty) - 1))
                  }
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={editCommonQty}
                  onFocus={() =>
                    clearZeroOnFocus(editCommonQty, setEditCommonQty)
                  }
                  onBlur={() =>
                    restoreZeroOnBlur(editCommonQty, setEditCommonQty)
                  }
                  onChange={(e) => setEditCommonQty(e.target.value)}
                />
                <button
                  className="qty-btn"
                  onClick={() => setEditCommonQty(Number(editCommonQty) + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="divider" />

            <label className="label">
              Search Special Item / विशेष कपड़ा खोजें
            </label>
            <input
              placeholder="Type item name / नाम लिखें..."
              value={editSpecialSearch}
              onChange={(e) => setEditSpecialSearch(e.target.value)}
              onFocus={() => setEditSpecialSearch("")}
            />

            <div className="items-list">
              {rates
                .filter((item) =>
                  `${item.en} ${item.hi}`
                    .toLowerCase()
                    .includes(editSpecialSearch.toLowerCase()),
                )
                .map((item) => {
                  const qty = editItemQtys[item._id] ?? 0;
                  const hasQty = Number(qty) > 0;
                  return (
                    <div
                      className={`item-row ${hasQty ? "has-qty" : ""}`}
                      key={item._id}
                    >
                      <div>
                        <div className="item-name">
                          {item.en} ({item.hi})
                        </div>
                        <div className="item-rate">
                          Rate: {money(item.rate)}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onFocus={() =>
                          clearZeroOnFocus(qty, (v) =>
                            setEditItemQtys((prev) => ({
                              ...prev,
                              [item._id]: v,
                            })),
                          )
                        }
                        onBlur={() =>
                          restoreZeroOnBlur(qty, (v) =>
                            setEditItemQtys((prev) => ({
                              ...prev,
                              [item._id]: v,
                            })),
                          )
                        }
                        onChange={(e) =>
                          setEditItemQtys((prev) => ({
                            ...prev,
                            [item._id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  );
                })}
            </div>

            <div className="divider" />

            <div style={{ display: "flex", gap: 10 }}>
              <button className="secondary full" onClick={closeEditEntry}>
                Cancel / रद्द करें
              </button>
              <button className="primary full" onClick={handleUpdateEntry}>
                Save Changes / सेव करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
