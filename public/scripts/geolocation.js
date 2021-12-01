const locationInput = document.getElementById('locationInput')
const weatherInput = document.getElementById('weatherInput')
const newEntrySubmit = document.getElementById('newEntrySubmit')

var request = new XMLHttpRequest();

request.onload = () => {
  if (request.status != 200) {
    weatherInput.value="Unavailible"
  } else {
    parsed = JSON.parse(request.response)
    weatherInput.value = parsed.weather[0].description
  }
  newEntrySubmit.disabled = false
  newEntrySubmit.innerText = "SUBMIT"
}

const apiKey = "ddf41b6a9c50f295b6389305e6ddd2a5"

newEntrySubmit.disabled = true
newEntrySubmit.innerText = "Just a sec... gathering weather information"

navigator.geolocation.getCurrentPosition((position) => {
  locationInput.value = `${position.coords.latitude},${position.coords.longitude}`

  request.open('GET', `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&exclude=daily,hourly,minutely,alerts&appid=${apiKey}`)
  request.send()
});