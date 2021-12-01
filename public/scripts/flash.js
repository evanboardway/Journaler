const flash = document.getElementById('flash')
const flashButton = document.getElementById('flashButton')
if (flash) {
    flashButton.addEventListener('click', () => {
        flash.classList.toggle('hidden')
    })
}