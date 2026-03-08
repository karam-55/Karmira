/**
 * كرم و ميرا - ذكرياتنا + معرض الصور
 * حفظ آمن + نسخة احتياطية
 */

const STORAGE_KEY = "karam-mira-memories";
const GALLERY_KEY = "karam-mira-gallery";
const BACKUP_SESSION_KEY = "karam-mira-backup-session"; // نسخة مؤقتة عند فشل الحفظ

const btnAddMemory = document.getElementById("btnAddMemory");
const memoryForm = document.getElementById("memoryForm");
const btnCancel = document.getElementById("btnCancel");
const memoriesGrid = document.getElementById("memoriesGrid");
const emptyState = document.getElementById("emptyState");

const memoryTitle = document.getElementById("memoryTitle");
const memoryDate = document.getElementById("memoryDate");
const memoryDesc = document.getElementById("memoryDesc");
const memoryImage = document.getElementById("memoryImage");

const photoInput = document.getElementById("photoInput");
const galleryGrid = document.getElementById("galleryGrid");
const galleryEmpty = document.getElementById("galleryEmpty");

const lightbox = document.getElementById("lightbox");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");

let galleryPhotos = [];
let lightboxIndex = 0;

const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.82;

// —— حفظ آمن في localStorage ——
function setStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (err.name === "QuotaExceededError" || err.code === 22) {
      try {
        sessionStorage.setItem(BACKUP_SESSION_KEY, JSON.stringify({
          memories: getMemories(),
          gallery: getGallery(),
          at: new Date().toISOString(),
        }));
      } catch (_) {}
      alert(
        "المساحة التخزينية ممتلئة. جرّب:\n" +
        "• تصدير نسخة احتياطية (زر أدناه) وحفظ الملف على جهازك.\n" +
        "• حذف بعض الصور من المعرض ثم أعد المحاولة."
      );
    } else {
      alert("حدث خطأ أثناء الحفظ. جرّب تصدير نسخة احتياطية.");
    }
    return false;
  }
}

function getStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// —— التبويبات ——
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.getAttribute("data-tab");
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + target).classList.add("active");
    if (target === "gallery") renderGallery();
  });
});

// —— الذكريات ——
function getMemories() {
  try {
    const data = getStorage(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMemories(memories) {
  if (!setStorage(STORAGE_KEY, JSON.stringify(memories))) return;
  renderMemories();
}

function showForm() {
  memoryForm.classList.remove("hidden");
  memoryForm.reset();
  memoryDate.value = new Date().toISOString().slice(0, 10);
  memoryTitle.focus();
}

function hideForm() {
  memoryForm.classList.add("hidden");
}

function renderMemories() {
  const memories = getMemories();
  memoriesGrid.innerHTML = "";

  if (memories.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  const sorted = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((mem, index) => {
    const card = document.createElement("article");
    card.className = "memory-card";
    card.setAttribute("data-id", mem.id);

    const imageSection = mem.image
      ? `<img class="memory-card-image" src="${escapeHtml(mem.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="memory-card-image memory-card-image-placeholder">💕</div>`;

    card.innerHTML = `
      ${imageSection}
      <div class="memory-card-body">
        <div class="memory-card-date">${formatDate(mem.date)}</div>
        <h3 class="memory-card-title">${escapeHtml(mem.title)}</h3>
        ${mem.desc ? `<p class="memory-card-desc">${escapeHtml(mem.desc)}</p>` : ""}
        <div class="memory-card-actions">
          <button type="button" class="btn-delete" data-id="${mem.id}" aria-label="حذف الذكرى">🗑️ حذف</button>
        </div>
      </div>
    `;

    memoriesGrid.appendChild(card);
  });

  memoriesGrid.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteMemory(btn.getAttribute("data-id")));
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function deleteMemory(id) {
  if (!confirm("هل تريد حذف هذه الذكرى؟")) return;
  const memories = getMemories().filter((m) => m.id !== id);
  saveMemories(memories);
}

memoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = memoryTitle.value.trim();
  const date = memoryDate.value;
  const desc = memoryDesc.value.trim();
  const image = memoryImage.value.trim();
  if (!title || !date) return;
  const memories = getMemories();
  memories.push({
    id: generateId(),
    title,
    date,
    desc: desc || "",
    image: image || "",
  });
  saveMemories(memories);
  hideForm();
});

btnAddMemory.addEventListener("click", showForm);
btnCancel.addEventListener("click", hideForm);

// —— معرض الصور ——
function getGallery() {
  try {
    const data = getStorage(GALLERY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveGallery(photos) {
  const str = JSON.stringify(photos);
  if (!setStorage(GALLERY_KEY, str)) return;
  galleryPhotos = photos;
  renderGallery();
}

/** ضغط الصورة وتصغيرها لتوفير المساحة */
function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      let width = w;
      let height = h;
      if (w > MAX_IMAGE_WIDTH) {
        width = MAX_IMAGE_WIDTH;
        height = Math.round((h * MAX_IMAGE_WIDTH) / w);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(dataUrl);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        IMAGE_QUALITY
      );
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function renderGallery() {
  const photos = getGallery();
  galleryPhotos = photos;
  galleryGrid.innerHTML = "";

  if (photos.length === 0) {
    galleryEmpty.classList.remove("hidden");
    return;
  }

  galleryEmpty.classList.add("hidden");

  photos.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.setAttribute("data-index", index);
    item.innerHTML = `
      <img src="${photo.dataUrl}" alt="${escapeHtml(photo.caption || "صورة")}" loading="lazy" />
      <button type="button" class="gallery-delete" data-id="${photo.id}" aria-label="حذف الصورة">🗑️</button>
    `;
    item.querySelector("img").addEventListener("click", () => openLightbox(index));
    item.querySelector(".gallery-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deletePhoto(photo.id);
    });
    galleryGrid.appendChild(item);
  });
}

function deletePhoto(id) {
  if (!confirm("هل تريد حذف هذه الصورة؟")) return;
  const photos = getGallery().filter((p) => p.id !== id);
  saveGallery(photos);
}

photoInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  const photos = getGallery();
  let processed = 0;
  const total = Array.from(files).filter((f) => f.type.startsWith("image/")).length;
  if (total === 0) {
    e.target.value = "";
    return;
  }

  const processFile = (file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let dataUrl = reader.result;
      try {
        dataUrl = await compressImage(dataUrl);
      } catch (_) {}
      photos.push({
        id: generateId(),
        dataUrl,
        caption: file.name.replace(/\.[^.]+$/, ""),
        date: new Date().toISOString(),
      });
      processed++;
      if (processed === total) {
        saveGallery(photos);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  for (let i = 0; i < files.length; i++) processFile(files[i]);
});

// —— لايت بوكس ——
function openLightbox(index) {
  lightboxIndex = index;
  lightbox.classList.remove("hidden");
  requestAnimationFrame(() => lightbox.classList.add("active"));
  updateLightboxImage();
}

function closeLightbox() {
  lightbox.classList.remove("active");
  setTimeout(() => lightbox.classList.add("hidden"), 350);
}

function updateLightboxImage() {
  if (galleryPhotos.length === 0) return;
  const i = (lightboxIndex + galleryPhotos.length) % galleryPhotos.length;
  lightboxIndex = i;
  const photo = galleryPhotos[i];
  lightboxImg.src = photo.dataUrl;
  lightboxCaption.textContent = photo.caption || "";
}

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => {
  lightboxIndex--;
  updateLightboxImage();
});
lightboxNext.addEventListener("click", () => {
  lightboxIndex++;
  updateLightboxImage();
});

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("active")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") lightboxIndex--, updateLightboxImage();
  if (e.key === "ArrowLeft") lightboxIndex++, updateLightboxImage();
});

// —— نسخة احتياطية: تصدير واستيراد ——
function exportBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    memories: getMemories(),
    gallery: getGallery(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ذكريات-كرم-وميرا-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const memories = Array.isArray(data.memories) ? data.memories : [];
      const gallery = Array.isArray(data.gallery) ? data.gallery : [];
      if (memories.length === 0 && gallery.length === 0) {
        alert("الملف لا يحتوي على ذكريات أو صور.");
        return;
      }
      if (!confirm("استيراد النسخة الاحتياطية سيستبدل البيانات الحالية. متابعة؟")) return;
      setStorage(STORAGE_KEY, JSON.stringify(memories));
      setStorage(GALLERY_KEY, JSON.stringify(gallery));
      renderMemories();
      renderGallery();
      alert("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch {
      alert("ملف غير صالح. تأكد أنه ملف النسخة الاحتياطية من هذا الموقع.");
    }
  };
  reader.readAsText(file);
}

document.getElementById("btnExport").addEventListener("click", exportBackup);
document.getElementById("importInput").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) importBackup(f);
  e.target.value = "";
});

// استعادة مؤقتة من sessionStorage إن وُجدت (بعد امتلاء المساحة)
try {
  const sessionBackup = sessionStorage.getItem(BACKUP_SESSION_KEY);
  if (sessionBackup && getMemories().length === 0 && getGallery().length === 0) {
    const data = JSON.parse(sessionBackup);
    if (data.memories?.length || data.gallery?.length) {
      if (confirm("يوجد نسخة مؤقتة من آخر مرة. استعادتها؟")) {
        setStorage(STORAGE_KEY, JSON.stringify(data.memories || []));
        setStorage(GALLERY_KEY, JSON.stringify(data.gallery || []));
        sessionStorage.removeItem(BACKUP_SESSION_KEY);
        renderMemories();
        renderGallery();
      }
    }
  }
} catch (_) {}

// التشغيل الأول
renderMemories();
renderGallery();
