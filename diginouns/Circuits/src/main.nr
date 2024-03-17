// Define the main function which takes three public inputs
fn main(fire: pub Field, water: pub Field, earth: pub Field, wind: pub Field) {
    assert(fire == 35); 
    assert(water == 30);
    assert(earth == 15);
    assert(wind == 20);
    // Perform the multiplication
    let result = fire + water + earth + wind;

    // Assert that the computed result matches the provided output
    assert(result == 100);

    let ice = water + wind;
    let lava = earth + fire;

    let totalDamage = water + fire + earth + wind + ice + lava;

    assert(totalDamage == 200);
}