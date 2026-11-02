import vehicles from './vehicleCatalog.json';

export const vehicleCatalog = vehicles;
export const starterVehicle = Object.freeze(vehicles.find((vehicle) => vehicle.id === 'nightrun-club-sport') || vehicles[0]);

export function getVehicleById(id) {
  return vehicles.find((vehicle) => vehicle.id === id) || starterVehicle;
}
