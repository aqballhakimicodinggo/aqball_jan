document.querySelector('form').addEventListener('submit', function(event) {
       event.preventDefault();
       alert('Form submitted!');
   });

async function handlePassportUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('passport-preview');
    const passportField = document.getElementById('first-name');
    const nameField = document.getElementById('last-name');
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            // Show preview image at reduced size 350x180px
            preview.innerHTML = `<img src="${e.target.result}" alt="Passport Preview" style="width:350px;height:180px;object-fit:cover;border-radius:8px;box-shadow:0 2px 8px #7f9cf533;">`;
            preview.innerHTML += '<div id="ocr-status" style="color:#4f7cff;margin-top:8px;">در حال خواندن پاسپورت...</div>';
            // Resize for OCR
            const img = new window.Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                canvas.width = 650;
                canvas.height = 350;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 650, 350);
                const dataUrl = canvas.toDataURL('image/jpeg');
                try {
                    const result = await Tesseract.recognize(dataUrl, 'eng', { logger: m => { /* Optionally log progress */ } });
                    let text = result.data.text;
                    // Find MRZ lines (usually last two lines with lots of <)
                    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    let mrzLines = lines.filter(l => (l.match(/</g) || []).length > 10);
                    let passportNumber = '';
                    let name = '';
                    if (mrzLines.length >= 2) {
                        let rawPassport = mrzLines[1].substring(0, 9).replace(/</g, '');
                        passportNumber = cleanPassportNumber(rawPassport);
                        let namePart = mrzLines[0].split('<<')[1] || '';
                        name = namePart.replace(/</g, ' ').trim();
                    }
                    passportField.value = passportNumber;
                    nameField.value = name;
                    document.getElementById('ocr-status').innerText =
                        (passportNumber ? `پاسپورت نمبر خوانده شد: ${passportNumber}` : 'شماره پاسپورت پیدا نشد.') +
                        (name ? ` | نام: ${name}` : '') +
                        `\nMRZ1: ${mrzLines[0] || ''}\nMRZ2: ${mrzLines[1] || ''}`;
                } catch (err) {
                    document.getElementById('ocr-status').innerText = 'خطا در خواندن پاسپورت.';
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
        passportField.value = '';
        nameField.value = '';
    }
}

function cleanPassportNumber(raw) {
    // Replace common OCR mistakes
    return raw
        .replace(/O/g, '0')
        .replace(/I/g, '1')
        .replace(/L/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/[^A-Z0-9]/gi, '') // Remove non-alphanumeric
        .toUpperCase();
}
