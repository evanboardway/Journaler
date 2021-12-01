const locationInput = document.getElementById('locationInput')
const weatherInput = document.getElementById('weatherInput')
const newEntrySubmit = document.getElementById('newEntrySubmit')

var request = new XMLHttpRequest();

request.onload = (response) => {
  console.log("resp", response)
  weatherInput.value="Unavailible"
  newEntrySubmit.disabled = false
}

const apiKey = "ddf41b6a9c50f295b6389305e6ddd2a5"

newEntrySubmit.disabled = true

navigator.geolocation.getCurrentPosition((position) => {
  locationInput.value = `${position.coords.latitude},${position.coords.longitude}`

  request.open('GET', `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&appid=${apiKey}`)
  request.send()
});