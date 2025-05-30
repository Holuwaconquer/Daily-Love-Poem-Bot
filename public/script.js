const poemStatus = document.getElementById('poemStatus');
const poemBox = document.getElementById('poemBox');
const fetchPoemBtn = document.getElementById('fetchPoemBtn');  // make sure button has this id

async function sendPoem() {
  poemStatus.textContent = "Sending your love poem...";
  poemBox.textContent = '';
  try {
    const res = await fetch('/send-poem');
    const data = await res.json();

    if (data.success) {
      poemStatus.textContent = "Poem sent by Okikiola ❤️";
      poemBox.textContent = data.poem;
    } else {
      poemStatus.textContent = "Failed to send poem 😢";
    }
  } catch (err) {
    console.error(err);
    poemStatus.textContent = "Error sending poem.";
  }
}

fetchPoemBtn.addEventListener('click', sendPoem);
