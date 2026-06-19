const SHEETS_JSON_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vEjemploDePublicacion/pub?gid=0&single=true&output=gviz&tqx=out:json";

const fallbackGrades = [
  { carnet: "A-001", alumno: "Sofía Martínez", grado: "6° Primaria", actividad: "Investigación de ciencias", tipo: "Tarea", nota: 92 },
  { carnet: "A-002", alumno: "Diego Hernández", grado: "6° Primaria", actividad: "Examen de matemáticas", tipo: "Examen", nota: 87 },
  { carnet: "A-003", alumno: "Valeria López", grado: "1° Básico", actividad: "Lectura guiada", tipo: "Tarea", nota: 95 },
  { carnet: "A-004", alumno: "Carlos Méndez", grado: "1° Básico", actividad: "Proyecto de historia", tipo: "Proyecto", nota: 89 },
  { carnet: "A-005", alumno: "María González", grado: "2° Básico", actividad: "Laboratorio", tipo: "Tarea", nota: 91 }
];

const tableBody = document.querySelector("#gradesTableBody");
const searchInput = document.querySelector("#searchInput");
const totalStudents = document.querySelector("#totalStudents");
const generalAverage = document.querySelector("#generalAverage");
const submittedTasks = document.querySelector("#submittedTasks");
const recordCount = document.querySelector("#recordCount");
const statusText = document.querySelector("#statusText");
const emptyState = document.querySelector("#emptyState");
const errorState = document.querySelector("#errorState");

let grades = [];

async function fetchGradesFromSheets() {
  const response = await fetch(SHEETS_JSON_URL);

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const rawData = contentType.includes("application/json") ? await response.json() : await response.text();
  return normalizeSheetsData(rawData);
}

function normalizeSheetsData(data) {
  if (Array.isArray(data)) {
    return data.map(mapRecord);
  }

  if (typeof data === "string") {
    return data.includes("google.visualization.Query.setResponse")
      ? parseGoogleVisualizationJson(data)
      : parseDelimitedText(data);
  }

  const rows = data?.values || data?.data || data?.feed?.entry || [];
  return rows.map(mapRecord).filter(Boolean);
}

function parseGoogleVisualizationJson(text) {
  const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const table = JSON.parse(jsonText).table;

  return table.rows.map((row) => {
    const [carnet, alumno, grado, actividad, tipo, nota] = row.c.map((cell) => cell?.v ?? "");

    return {
      carnet,
      alumno,
      grado,
      actividad,
      tipo,
      nota: Number(nota) || 0
    };
  });
}

function parseDelimitedText(text) {
  const rows = text.trim().split(/\r?\n/).map((row) => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
  const [, ...body] = rows;

  return body.map(([carnet, alumno, grado, actividad, tipo, nota]) => ({
    carnet: cleanCell(carnet),
    alumno: cleanCell(alumno),
    grado: cleanCell(grado),
    actividad: cleanCell(actividad),
    tipo: cleanCell(tipo),
    nota: Number(cleanCell(nota)) || 0
  }));
}

function mapRecord(record) {
  if (Array.isArray(record)) {
    const [carnet, alumno, grado, actividad, tipo, nota] = record;
    return { carnet, alumno, grado, actividad, tipo, nota: Number(nota) || 0 };
  }

  return {
    carnet: record.Carnet || record.carnet || record.gsx$carnet?.$t || "",
    alumno: record.Alumno || record.alumno || record.gsx$alumno?.$t || "",
    grado: record.Grado || record.grado || record.gsx$grado?.$t || "",
    actividad: record.Actividad || record.actividad || record.gsx$actividad?.$t || "",
    tipo: record.Tipo || record.tipo || record.gsx$tipo?.$t || "",
    nota: Number(record.Nota || record.nota || record.gsx$nota?.$t) || 0
  };
}

function cleanCell(value = "") {
  return String(value).trim().replace(/^"|"$/g, "");
}

function renderTable(records) {
  tableBody.innerHTML = records.map((record) => `
    <tr>
      <td>${escapeHtml(record.carnet)}</td>
      <td><strong>${escapeHtml(record.alumno)}</strong></td>
      <td><span class="grade-pill">${escapeHtml(record.grado)}</span></td>
      <td>${escapeHtml(record.actividad)}</td>
      <td><span class="type-pill">${escapeHtml(record.tipo)}</span></td>
      <td><strong>${Number(record.nota).toFixed(2)}</strong></td>
    </tr>
  `).join("");

  recordCount.textContent = `${records.length} ${records.length === 1 ? "registro" : "registros"}`;
  emptyState.hidden = records.length > 0;
}

function updateSummary(records) {
  const uniqueStudents = new Set(records.map((record) => record.carnet || record.alumno));
  const totalNotes = records.reduce((sum, record) => sum + Number(record.nota || 0), 0);
  const average = records.length ? totalNotes / records.length : 0;
  const tasks = records.filter((record) => record.tipo.toLowerCase().includes("tarea")).length;

  totalStudents.textContent = uniqueStudents.size;
  generalAverage.textContent = average.toFixed(2);
  submittedTasks.textContent = tasks;
}

function filterGrades() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredRecords = grades.filter((record) => {
    return record.alumno.toLowerCase().includes(query) || record.carnet.toLowerCase().includes(query);
  });

  renderTable(filteredRecords);
  updateSummary(filteredRecords);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  })[character]);
}

async function init() {
  try {
    grades = await fetchGradesFromSheets();
    statusText.textContent = "Datos conectados";
  } catch (error) {
    console.warn("Usando datos de ejemplo:", error);
    grades = fallbackGrades;
    errorState.hidden = false;
    statusText.textContent = "Modo demostración";
  }

  renderTable(grades);
  updateSummary(grades);
}

searchInput.addEventListener("input", filterGrades);
init();
