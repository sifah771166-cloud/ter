const formatDate = (iso) => new Date(iso).toLocaleDateString('id-ID');

// Navigasi
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    max-width: 500px;
    word-wrap: break-word;
    background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Load data

function loadBarang() {
  fetch("/barang")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("barangP");
      select.innerHTML = '<option value="">Pilih Barang</option>';
      data.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = `${item.nama} (Stok: ${item.stok})`;
        select.appendChild(option);
      });
    })
    .catch(err => {
      console.error("Error loading barang:", err);
      showNotification("Error loading barang data", 'error');
    });
}

function loadKunjungan() {
  fetch("/kunjungan")
    .then(res => res.json())
    .then(data => {
      let html = "";
      if (data.length === 0) {
        html = '<tr><td colspan="4" style="text-align: center;">No data</td></tr>';
      } else {
        data.forEach(item => {
          html += `<tr>
            <td>${item.nama}</td>
            <td>${item.kelas}</td>
            <td>${formatDate(item.waktu)}</td>
            <td><button onclick="hapusKunjungan(${item.id})" class="btn-delete">Hapus</button></td>
          </tr>`;
        });
      }
      document.getElementById("tableKunjungan").innerHTML = html;
      document.getElementById("totalK").innerText = data.length;
    })
    .catch(err => {
      console.error("Error loading kunjungan:", err);
      showNotification("Error loading kunjungan data", 'error');
    });
}

function tambahKunjungan() {
  const nama = document.getElementById("namaK").value.trim();
  const kelas = document.getElementById("kelasK").value.trim();
  const tanggal = document.getElementById("tanggalK").value;

  if (!nama || !kelas) {
    showNotification("Please fill in Nama and Kelas", 'error');
    return;
  }

  fetch("/kunjungan", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      nama: nama,
      kelas: kelas,
      tanggal: tanggal
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showNotification(data.error, 'error');
    } else {
      document.getElementById("namaK").value = '';
      document.getElementById("kelasK").value = '';
      document.getElementById("tanggalK").value = '';
      showNotification("Kunjungan added successfully", 'success');
      loadKunjungan();
    }
  })
  .catch(err => {
    console.error("Error adding kunjungan:", err);
    showNotification("Error adding kunjungan", 'error');
  });
}

function hapusKunjungan(id) {
  if (!confirm("Are you sure you want to delete this kunjungan?")) return;
  
  fetch("/kunjungan/" + id, {method:"DELETE"})
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showNotification(data.error, 'error');
      } else {
        showNotification("Kunjungan deleted successfully", 'success');
        loadKunjungan();
      }
    })
    .catch(err => {
      console.error("Error deleting kunjungan:", err);
      showNotification("Error deleting kunjungan", 'error');
    });
}

// Peminjaman
function loadPeminjaman() {
  fetch("/peminjaman")
    .then(res => res.json())
    .then(data => {
      let html = "";
      if (data.length === 0) {
        html = '<tr><td colspan="6" style="text-align: center;">No data</td></tr>';
      } else {
        data.forEach(item => {
          html += `<tr>
            <td>${item.nama}</td>
            <td>${item.barang_nama}</td>
            <td>${formatDate(item.waktu_pinjam)}</td>
            <td>${item.jumlah}</td>
            <td class="${item.status}">${item.status}</td>
            <td>
              ${item.status === 'dipinjam' ? `<button onclick="kembaliPeminjaman(${item.id})" class="btn-primary">Kembali</button>` : ''}
              <button onclick="hapusPeminjaman(${item.id})" class="btn-delete">Hapus</button>
            </td>
          </tr>`;
        });
      }
      document.getElementById("tablePeminjaman").innerHTML = html;
      document.getElementById("totalP").innerText = data.length;
    })
    .catch(err => {
      console.error("Error loading peminjaman:", err);
      showNotification("Error loading peminjaman data", 'error');
    });
}

function tambahPeminjaman() {
  const nama = document.getElementById("namaP").value.trim();
  const barangId = document.getElementById("barangP").value;
  const jumlah = document.getElementById("jumlahP").value;
  const tanggal = document.getElementById("tanggalP").value;

  if (!nama || !barangId) {
    showNotification("Please fill in Nama and select Barang", 'error');
    return;
  }

  const jumlahInt = parseInt(jumlah);
  if (isNaN(jumlahInt) || jumlahInt <= 0) {
    showNotification("Jumlah must be a positive number", 'error');
    return;
  }

  fetch("/peminjaman", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      nama: nama,
      barang_id: parseInt(barangId),
      jumlah: jumlahInt,
      tanggal: tanggal
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showNotification(data.error, 'error');
    } else {
      document.getElementById("namaP").value = '';
      document.getElementById("barangP").value = '';
      document.getElementById("jumlahP").value = '';
      document.getElementById("tanggalP").value = '';
      showNotification("Peminjaman added successfully", 'success');
      loadBarang();
      loadPeminjaman();
    }
  })
  .catch(err => {
    console.error("Error adding peminjaman:", err);
    showNotification("Error adding peminjaman", 'error');
  });
}

function hapusPeminjaman(id) {
  if (!confirm("Are you sure you want to delete this peminjaman?")) return;
  
  fetch("/peminjaman/" + id, {method:"DELETE"})
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showNotification(data.error, 'error');
      } else {
        showNotification("Peminjaman deleted successfully", 'success');
        loadBarang();
        loadPeminjaman();
      }
    })
    .catch(err => {
      console.error("Error deleting peminjaman:", err);
      showNotification("Error deleting peminjaman", 'error');
    });
}

function kembaliPeminjaman(id) {
  if (!confirm("Are you sure you want to mark this as returned?")) return;
  
  fetch("/peminjaman/" + id, {method:"PUT"})
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showNotification(data.error, 'error');
      } else {
        showNotification("Item returned successfully", 'success');
        loadBarang();
        loadPeminjaman();
      }
    })
    .catch(err => {
      console.error("Error returning peminjaman:", err);
      showNotification("Error returning peminjaman", 'error');
    });
}

// Load awal
loadBarang();
loadKunjungan();
loadPeminjaman();