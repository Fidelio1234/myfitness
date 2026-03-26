const API_KEY = "8f3801ef4emsh4303288c29516f6p13ed75jsn7386bb1247ec";
const API_HOST = "exercisedb.p.rapidapi.com";
const BASE_URL = "https://exercisedb.p.rapidapi.com";

const headers = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": API_HOST,
  "Content-Type": "application/json"
};

export async function getBodyParts() {
  const res = await fetch(`${BASE_URL}/exercises/bodyPartList`, { headers });
  return res.json();
}

export async function getExercisesByBodyPart(bodyPart, limit = 50) {
  const res = await fetch(`${BASE_URL}/exercises/bodyPart/${bodyPart}?limit=${limit}&offset=0`, { headers });
  return res.json();
}

export async function searchExercises(query, limit = 20) {
  const res = await fetch(`${BASE_URL}/exercises/name/${query.toLowerCase()}?limit=${limit}&offset=0`, { headers });
  return res.json();
}