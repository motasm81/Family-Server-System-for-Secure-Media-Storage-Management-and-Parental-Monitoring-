let AUTH_TOKEN = localStorage.getItem("token");
let appChartInstance = null;
let CURRENT_CHILD = null;

/* ================= LOAD CHILDREN ================= */
async function loadChildren() {
    const response = await fetch("/api/children", {
        headers: { "Authorization": "token " + AUTH_TOKEN }
    });

    const data = await response.json();
    const list = document.getElementById("childList");
    list.innerHTML = "";

    data.children.forEach(child => {
        const item = document.createElement("div");
        item.className = "child-item";
        item.textContent = child.username;
        item.onclick = () => openChild(child.username);
        list.appendChild(item);
    });
}

/* ================= OPEN CHILD ================= */
function openChild(username) {
    CURRENT_CHILD = username;

    /* ---------- Highlight selected child ---------- */
    document.querySelectorAll(".child-item")
        .forEach(el => el.classList.remove("active"));

    [...document.querySelectorAll(".child-item")]
        .find(el => el.textContent === username)
        ?.classList.add("active");

    /* ---------- Sections visibility ---------- */
    document.getElementById("child-details").classList.remove("hidden");
    document.getElementById("alerts-section")?.classList.add("hidden");
    document.getElementById("reports-section")?.classList.add("hidden");

    /* ---------- Load existing child data (UNCHANGED) ---------- */
    loadDeviceInfo(username);
    loadTodayScreenTime(username);
    loadTodayAppUsage(username);

    /* ---------- Reports integration (NEW but SAFE) ---------- */
    const reportName = document.getElementById("reportChildName");
    if (reportName) {
        reportName.textContent = "👶 Child: " + username;
    }

    const reportsSection = document.getElementById("reports-section");
    if (reportsSection && !reportsSection.classList.contains("hidden")) {
        loadReport();
    }
}


/* ================= DEVICE INFO ================= */
async function loadDeviceInfo(username) {
    const response = await fetch(`/api/child/device?username=${username}`, {
        headers: { "Authorization": "token " + AUTH_TOKEN }
    });

    const child = await response.json();

    const battery = child.battery ?? child.battery_level ?? 0;
    document.getElementById("batteryValue").textContent = battery + "%";
    document.getElementById("batteryBar").style.width = battery + "%";

    const total = child.totalStorage ?? child.total_storage;
    const free = child.freeStorage ?? child.free_storage;

    if (total && free) {
        const used = total - free;
        document.getElementById("storageValue").textContent =
            formatGB(used) + " / " + formatGB(total);
        document.getElementById("storageBar").style.width =
            Math.round((used / total) * 100) + "%";
    } else {
        document.getElementById("storageValue").textContent = "Unknown";
    }

    document.getElementById("childName").textContent = username;
    document.getElementById("modelValue").textContent =
        child.deviceModel ?? child.model ?? "Unknown";
    document.getElementById("androidValue").textContent =
        child.osVersion ?? child.android ?? "Unknown";

    document.getElementById("lastUpdate").textContent =
        child.timestamp
            ? new Date(child.timestamp).toLocaleString()
            : (child.updated_at ?? "Unknown");
}

/* ================= TODAY SCREEN TIME ================= */
function loadTodayScreenTime(username) {
    fetch(`/api/screen-time?username=${username}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById("screenTime").textContent =
                formatDuration(data.total_ms ?? 0);
        });
}

/* ================= TODAY APP USAGE ================= */
function loadTodayAppUsage(username) {
    fetch(`/api/app-usage?username=${username}`)
        .then(r => r.json())
        .then(data => {
            if (!data.apps || data.apps.length === 0) {
                document.getElementById("appTotalTime").textContent = "0 min";
                return;
            }

            const labels = [];
            const values = [];
            let totalMs = 0;

            data.apps.forEach(app => {
                labels.push(app.app_name);
                values.push(app.usage_ms / 60000);
                totalMs += app.usage_ms;
            });

            document.getElementById("appTotalTime").textContent =
                formatDuration(totalMs);

            const ctx = document.getElementById("appChart");

            if (appChartInstance) appChartInstance.destroy();

            appChartInstance = new Chart(ctx, {
                type: "bar",
                data: {
                    labels,
                    datasets: [{ data: values }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        });
}

/* ================= ALERTS ================= */
async function loadAlerts() {
    const response = await fetch("/api/alerts/today", {
        headers: { "Authorization": "token " + AUTH_TOKEN }
    });

    const data = await response.json();
    const list = document.getElementById("alertsList");
    list.innerHTML = "";

    if (!data.alerts || data.alerts.length === 0) {
        list.innerHTML = "<p>No alerts today 🎉</p>";
        return;
    }

    data.alerts.forEach(alert => {
        const div = document.createElement("div");
        div.className = "alert-item";
        div.innerHTML = `
            <strong>${alert.alert_type}</strong><br>
            👶 Child: ${alert.child_username}<br>
            ⚠️ NSFW Score: ${alert.nsfw_score.toFixed(2)}<br>
            📄 File: ${alert.file_name}<br>
            <span class="alert-time">
                ${new Date(alert.created_at).toLocaleString()}
            </span>
        `;
        list.appendChild(div);
    });
}

function openAlerts() {
    document.getElementById("child-details").classList.add("hidden");
    document.getElementById("reports-section")?.classList.add("hidden");
    document.getElementById("alerts-section").classList.remove("hidden");
    loadAlerts();
}

/* ================= REPORTS ================= */
let AUTH_TOKEN = localStorage.getItem("token");
let CURRENT_CHILD = null;

/* ================= LOAD CHILDREN ================= */
async function loadChildren() {
    const response = await fetch("/api/children", {
        headers: { "Authorization": "token " + AUTH_TOKEN }
    });

    const data = await response.json();
    const childSelect = document.getElementById("childSelect");

    // Populate the child dropdown with children names
    data.children.forEach(child => {
        const option = document.createElement("option");
        option.value = child.username;
        option.textContent = child.username;
        childSelect.appendChild(option);
    });
}

/* ================= REPORT GENERATION ================= */
async function loadReport() {
    const childSelect = document.getElementById("childSelect");
    const period = document.getElementById("reportPeriod").value;

    if (!childSelect.value) {
        alert("Please select a child first.");
        return;
    }

    CURRENT_CHILD = childSelect.value;

    try {
        const response = await fetch(`/api/report?username=${encodeURIComponent(CURRENT_CHILD)}&period=${period}`, {
            headers: {
                "Authorization": "token " + AUTH_TOKEN,
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error("Failed to fetch report");

        const data = await response.json();

        // Screen Time
        document.getElementById("reportScreenTime").textContent = formatDuration(data.screen_time_ms || 0);

        // Alerts
        document.getElementById("reportAlertsCount").textContent = data.alerts_count || 0;
        document.getElementById("reportMaxScore").textContent = (data.max_nsfw_score || 0).toFixed(2);

        // Top Apps
        const appList = document.getElementById("reportTopApps");
        appList.innerHTML = "";
        data.top_apps.forEach(app => {
            const li = document.createElement("li");
            li.textContent = `${app.app_name} — ${formatDuration(app.usage_time_ms)}`;
            appList.appendChild(li);
        });

        // Media Activity
        document.getElementById("reportPhotos").textContent = data.media_activity?.photos || 0;
        document.getElementById("reportVideos").textContent = data.media_activity?.videos || 0;

        // Device Status
        document.getElementById("reportDeviceModel").textContent = data.device_status?.model || "—";
        document.getElementById("reportDeviceOS").textContent = data.device_status?.os_version || "—";
        document.getElementById("reportBattery").textContent = data.device_status?.battery || "—";
        document.getElementById("reportStorage").textContent = data.device_status?.free_storage_mb || "—";

    } catch (err) {
        console.error("Report load error:", err);
        alert("Error loading report data");
    }
}

/* ================= HELPERS ================= */
function formatGB(bytes) {
    return (bytes / (1024 ** 3)).toFixed(1) + " GB";
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
}

/* ================= INIT ================= */
window.onload = () => {
    loadChildren();

    const menuItems = document.querySelectorAll(".menu-item");
    menuItems[3].onclick = () => {     // 📄 Reports
        document.getElementById("child-details").classList.add("hidden");
        document.getElementById("alerts-section")?.classList.add("hidden");
        document.getElementById("reports-section").classList.remove("hidden");
    };
};


/* ================= HELPERS ================= */
function formatGB(bytes) {
    return (bytes / (1024 ** 3)).toFixed(1) + " GB";
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
}

/* ================= INIT ================= */
window.onload = () => {
    loadChildren();

    const menuItems = document.querySelectorAll(".menu-item");

    menuItems[2].onclick = openAlerts; // 🚨 Alerts

   menuItems[3].onclick = () => {     // 📄 Reports
       document.getElementById("child-details").classList.add("hidden");
       document.getElementById("alerts-section")?.classList.add("hidden");
       document.getElementById("reports-section").classList.remove("hidden");
        document.getElementById("overview-section").classList.remove("hidden");

       const name = document.getElementById("reportChildName");
       name.textContent = CURRENT_CHILD
           ? "👶 Child: " + CURRENT_CHILD
           : "👶 Select a child to view reports";
   };

};
