const { PDFDocument, StandardFonts } = PDFLib

const $ = (...args) => document.querySelector(...args)
const $$ = (...args) => document.querySelectorAll(...args)
const signaturePad = new SignaturePad($('#field-signature'), { minWidth: 1, maxWidth: 3 })

function hasProfile() {
  return localStorage.getItem('name') !== null
}

function saveProfile() {
  for (field of $$('#form-profile input:not([disabled]):not([type=checkbox])')) {
    localStorage.setItem(field.id.substring('field-'.length), field.value)
  }

  localStorage.setItem('signature', signaturePad.toDataURL())
}

function getProfile() {
  const fields = {}
  for (let i = 0; i < localStorage.length; i++){
    const name = localStorage.key(i)
    fields[name] = localStorage.getItem(name)
  }
  return fields
}

// function generateQR (text) {
//   const opts = {
//     errorCorrectionLevel: 'M',
//     type: 'image/png',
//     quality: 0.92,
//     margin: 1,
//   }
//   return QRCode.toDataURL(text, opts)
// }

async function generatePdf(profile, reason) {
  const url = 'certificate.pdf?v=bfc885e5326a9e0d3184aed9d183bca20a9cd76f'
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11) => {
    page.drawText(text, {x, y, size, font})
  }

  drawText(profile.name, 125, 696)
  drawText(profile.birthday, 125, 674)
  drawText(profile.birthplace || '', 300, 674)
  drawText(`${profile.address} ${profile.zipcode} ${profile.town}`, 140, 652)

  switch (reason) {
    case 'work':
      drawText('x', 76.5, 578, 20)
      break
    case 'groceries':
      drawText('x', 76.5, 533, 20)
      break
    case 'health':
      drawText('x', 76.5, 477, 20)
      break
    case 'family': // ok
      drawText('x', 76.5, 435, 20)
      break
    case 'handicap': // ok
      drawText('x', 76.5, 396, 20)
      break
    case 'sport':
      drawText('x', 76.5, 358, 20)
      break
    case 'convocation':
      drawText('x', 76.5, 295, 20)
      break
    case 'missions':
      drawText('x', 76.5, 255, 20)
      break
    case 'enfants':
      drawText('x', 76.5, 211, 20)
      break
  }

  drawText(profile['done-at'] || profile.town, 105, 175)

  if (reason !== '') {
    const date = [
      String((new Date(Date.now() - 10000 * 60)).getDate()).padStart(2, '0'),
      String((new Date(Date.now() - 10000 * 60)).getMonth() + 1).padStart(2, '0'),
      String((new Date(Date.now() - 10000 * 60)).getFullYear()),
    ].join('/')

    drawText(date, 91, 153)
    // drawText(String((new Date).getHours()).padStart(2, '0'), 264, 153)
    const hours = String(new Date(Date.now() - 10000 * 60).getHours()).padStart(2, '0')
  
    // Round the minutes to the lower X0 or X5 value, so it feels more human.
    const minutes = String(Math.floor((new Date(Date.now() - 10000 * 60)).getMinutes() / 5) * 5).padStart(2, '0');
    drawText(String(hours+'h'+minutes).padStart(2, '0'), 257, 153)
  }

  const signatureArrayBuffer = await fetch(profile.signature).then(res => res.arrayBuffer())
  const signatureImage = await pdfDoc.embedPng(signatureArrayBuffer)
  const signatureDimensions = signatureImage.scale(1 / (signatureImage.width / 80))

  page.drawImage(signatureImage, {
    x: page.getWidth() - signatureDimensions.width - 380,
    y: 90,
    width: signatureDimensions.width,
    height: signatureDimensions.height,
  })

//   const generatedQR = await generateQR(data)

//   const qrImage = await pdfDoc.embedPng(generatedQR)

//   page1.drawImage(qrImage, {
//     x: page1.getWidth() - 156,
//     y: 100,
//     width: 92,
//     height: 92,
//   })

//   pdfDoc.addPage()
//   const page2 = pdfDoc.getPages()[1]
//   page2.drawImage(qrImage, {
//     x: 50,
//     y: page2.getHeight() - 350,
//     width: 300,
//     height: 300,
//   })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], {type: 'application/pdf'})
}

function downloadBlob(blob, fileName) {
  const link = document.createElement('a')
  var url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  link.click()
}

function getAndSaveReason() {
  const {value} = $('input[name="field-reason"]:checked')
  localStorage.setItem('last-reason', value)
  return value
}

function restoreReason() {
  const value = localStorage.getItem('last-reason')
  if (value === null) {
    return
  }

  $(`#radio-${value}`).checked = true
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1)
}

function applyDoneAt() {
  const { checked } = $('#check-same-town')
  $('#group-done-at').style.display = checked ? 'none' : 'block';
  $('#field-done-at').disabled = checked;
}

if (isFacebookBrowser()) {
  $('#alert-facebook').style.display = 'block';
}

$('#alert-official .close').addEventListener('click', ({ target }) => {
  target.offsetParent.style.display = 'none'
  localStorage.setItem('dismiss-official-alert', true)
})

if (localStorage.getItem('dismiss-official-alert')) {
  $('#alert-official').style.display = 'none'
}

if (hasProfile()) {
  $('#form-generate').style.display = 'block'
} else {
  $('#form-profile').style.display = 'block'
}

$('#form-profile').addEventListener('submit', event => {
  event.preventDefault()
  saveProfile()
  location.reload()
})

$('#date-selector').addEventListener('change', ({ target }) => {
  $('#field-birthday').value = target.value.split('-').reverse().join('/')
})

$('#check-same-town').addEventListener('change', applyDoneAt)
applyDoneAt()

const formWidth = $('#form-profile').offsetWidth
$('#field-signature').width = formWidth
$('#field-signature').height = formWidth / 1.5

$('#reset-signature').addEventListener('click', () => signaturePad.clear())

$('#form-generate').addEventListener('submit', async event => {
  event.preventDefault()

  const button = event.target.querySelector('button[type=submit]')
  button.disabled = true

  const reason = getAndSaveReason()
  const profile = getProfile()

  if (profile.birthplace === undefined) {
    const birthplace = prompt([
      `La nouvelle attestation, en date du 25 mars, exige maintenant le lieu de naissance et votre profil ne contient`,
      `actuellement pas cette information, merci de compléter :`,
    ].join(' '))

    if (birthplace) {
      profile.birthplace = birthplace
      localStorage.setItem('birthplace', birthplace)
    }
  }

  const pdfBlob = await generatePdf(profile, reason)
  button.disabled = false

  downloadBlob(pdfBlob, 'attestation.pdf')
})

restoreReason()
