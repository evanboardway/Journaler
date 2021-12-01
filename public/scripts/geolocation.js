console.log("GEOLOCATION")

const locationInput = document.getElementById('locationInput')
const newEntrySubmit = document.getElementById('newEntrySubmit')

newEntrySubmit.disabled = true

navigator.geolocation.getCurrentPosition((position) => {
    console.log(position)
    locationInput.value = [position.coords.latitude, position.coords.longitude]
    newEntrySubmit.disabled = false
  });