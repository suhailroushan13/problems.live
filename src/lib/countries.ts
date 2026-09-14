/**
 * Curated country list for the location picker. A fixed vocabulary keeps the
 * `location.country` filter reliable — free text would fragment into typos.
 */
export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Benin",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Burkina Faso",
  "Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica",
  "Croatia","Cuba","Cyprus","Czechia","Denmark","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Georgia",
  "Germany","Ghana","Greece","Guatemala","Honduras","Hong Kong","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait",
  "Kyrgyzstan","Laos","Latvia","Lebanon","Libya","Lithuania","Luxembourg",
  "Madagascar","Malaysia","Mali","Malta","Mexico","Moldova","Mongolia","Morocco",
  "Mozambique","Myanmar","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama",
  "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Singapore",
  "Slovakia","Slovenia","Somalia","South Africa","South Korea","Spain",
  "Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tanzania",
  "Thailand","Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates",
  "United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam",
  "Yemen","Zambia","Zimbabwe",
] as const;

export type Country = (typeof COUNTRIES)[number];
