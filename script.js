const storageKey = "vaultTreinamentoDocs";
const storageLimitMb = 150;
const dbName = "vaultTreinamentoDB";
const dbVersion = 1;
const filesStoreName = "files";

const trainingDays = [
  {
    id: "seg",
    label: "Dia 1",
    name: "Segunda-feira",
    training: "Onboarding + Cultura",
    driveUrl:
      "https://docs.google.com/presentation/d/1GRIsfTt0fWHqSn4UJeVfKZWHjl1UQ7Kd/edit?usp=sharing&ouid=116387531387832367212&rtpof=true&sd=true"
  },
  {
    id: "ter",
    label: "Dia 2",
    name: "Terça-feira",
    training: "Processos operacionais",
    driveUrl:
      "https://docs.google.com/presentation/d/16ZtCLSF5vaskonP92cXY8TlMX5tbRb4Y/edit?usp=sharing&ouid=116387531387832367212&rtpof=true&sd=true"
  },
  { id: "qua", label: "Dia 3", name: "Quarta-feira", training: "Sistemas e fluxo" },
  { id: "qui", label: "Dia 4", name: "Quinta-feira", training: "Qualidade e compliance" },
  { id: "sex", label: "Dia 5", name: "Sexta-feira", training: "Projeto final + avaliação" }
];

let selectedDayId = trainingDays[0].id;
let filesState = loadFromStorage();

const dayNav = document.getElementById("dayNav");
const dayCards = document.getElementById("dayCards");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const fileList = document.getElementById("fileList");
const emptyState = document.getElementById("emptyState");
const totalDocs = document.getElementById("totalDocs");
const totalSize = document.getElementById("totalSize");
const storageProgress = document.getElementById("storageProgress");
const storageText = document.getElementById("storageText");

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(filesStoreName)) {
        db.createObjectStore(filesStoreName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putFileBlob(fileId, file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(filesStoreName, "readwrite");
    tx.objectStore(filesStoreName).put(file, fileId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getFileBlob(fileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(filesStoreName, "readonly");
    const request = tx.objectStore(filesStoreName).get(fileId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function removeFileBlob(fileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(filesStoreName, "readwrite");
    tx.objectStore(filesStoreName).delete(fileId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function loadFromStorage() {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : [];
}

function saveToStorage() {
  localStorage.setItem(storageKey, JSON.stringify(filesState));
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function currentDay() {
  return trainingDays.find((day) => day.id === selectedDayId);
}

function dayById(dayId) {
  return trainingDays.find((day) => day.id === dayId);
}

function driveDownloadUrl(driveUrl) {
  const match = driveUrl.match(/\/presentation\/d\/([^/]+)/);
  if (!match) return driveUrl;
  const fileId = match[1];
  return `https://docs.google.com/presentation/d/${fileId}/export/pptx`;
}

function renderDayNav() {
  dayNav.innerHTML = trainingDays
    .map(
      (day) => `
      <button class="day-button ${day.id === selectedDayId ? "active" : ""}" data-day-id="${day.id}">
        <strong>${day.label} · ${day.name}</strong>
        <small>${day.training}</small>
      </button>`
    )
    .join("");
}

function renderCards() {
  dayCards.innerHTML = trainingDays
    .map((day) => {
      const amount = filesState.filter((item) => item.dayId === day.id).length;
      const disabled = amount === 0 && !day.driveUrl ? "disabled" : "";
      return `
        <article class="day-card">
          <h4>${day.label}</h4>
          <p>${day.training}</p>
          <p><strong>${amount}</strong> documento(s)</p>
          ${day.driveUrl ? '<small class="external-resource">Material oficial no Google Drive</small>' : ""}
          <div class="card-actions">
            <button class="open-btn" data-open-day-id="${day.id}" ${disabled}>Baixar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRepository() {
  const filtered = filesState.filter((item) => item.dayId === selectedDayId);
  selectedDayTitle.textContent = `${currentDay().label} · ${currentDay().name}`;

  emptyState.classList.toggle("hidden", filtered.length > 0);
  fileList.innerHTML = filtered
    .map(
      (file) => `
      <li class="file-item">
        <div>
          <p><strong>${file.name}</strong></p>
          <small>${file.type || "Tipo não identificado"} · ${formatSize(file.size)} · enviado em ${file.uploadedAt}</small>
        </div>
        <div class="file-actions">
          <button class="open-btn" data-open-id="${file.id}">Baixar</button>
          <button class="remove-btn" data-remove-id="${file.id}">Remover</button>
        </div>
      </li>
    `
    )
    .join("");
}

function renderSummary() {
  const allBytes = filesState.reduce((sum, file) => sum + file.size, 0);
  const ratio = Math.min((allBytes / (storageLimitMb * 1024 * 1024)) * 100, 100);

  totalDocs.textContent = filesState.length;
  totalSize.textContent = formatSize(allBytes);
  storageProgress.style.width = `${ratio}%`;
  storageText.textContent = `${formatSize(allBytes)} de ${storageLimitMb} MB`;
}

async function addFiles(dayId, inputFiles) {
  const timestamp = new Date().toLocaleString("pt-BR");
  const prepared = [];

  for (const file of Array.from(inputFiles)) {
    const id = crypto.randomUUID();
    await putFileBlob(id, file);
    prepared.push({
      id,
      dayId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: timestamp
    });
  }

  filesState = [...prepared, ...filesState];
  saveToStorage();
  renderAll();
}

async function removeFile(fileId) {
  filesState = filesState.filter((item) => item.id !== fileId);
  await removeFileBlob(fileId);
  saveToStorage();
  renderAll();
}

async function downloadFile(fileId, fileName) {
  const blob = await getFileBlob(fileId);
  if (!blob) {
    alert("Arquivo não encontrado no armazenamento local.");
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName || "documento";
  link.click();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function latestFileFromDay(dayId) {
  return filesState.find((file) => file.dayId === dayId);
}

function renderAll() {
  renderDayNav();
  renderCards();
  renderRepository();
  renderSummary();
}

document.addEventListener("click", async (event) => {
  const dayButton = event.target.closest("[data-day-id]");
  if (dayButton && dayButton.classList.contains("day-button")) {
    selectedDayId = dayButton.dataset.dayId;
    renderAll();
    return;
  }

  const openByDayButton = event.target.closest("[data-open-day-id]");
  if (openByDayButton) {
    const { openDayId } = openByDayButton.dataset;
    const day = dayById(openDayId);

    if (day?.driveUrl) {
      const link = document.createElement("a");
      link.href = driveDownloadUrl(day.driveUrl);
      link.download = "material-terca-feira.pptx";
      link.rel = "noopener";
      link.target = "_self";
      link.click();
      return;
    }

    const latest = latestFileFromDay(openDayId);
    if (!latest) {
      alert("Este dia ainda não possui documentos para abrir.");
      return;
    }
    await downloadFile(latest.id, latest.name);
    return;
  }

  const openButton = event.target.closest("[data-open-id]");
  if (openButton) {
    const targetFile = filesState.find((item) => item.id === openButton.dataset.openId);
    await downloadFile(openButton.dataset.openId, targetFile?.name);
    return;
  }

  const removeButton = event.target.closest("[data-remove-id]");
  if (removeButton) {
    await removeFile(removeButton.dataset.removeId);
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("input[type='file'][data-day-id]")) {
    const { dayId } = event.target.dataset;
    if (event.target.files.length > 0) {
      await addFiles(dayId, event.target.files);
    }
    event.target.value = "";
  }
});

renderAll();
