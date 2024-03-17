// Define the main function which takes three public inputs
fn main(x: pub Field, y: pub Field, z: pub Field, a: pub Field) {
    // Perform the multiplication
    let result = x + y + z + a;

    // Assert that the computed result matches the provided output
    assert(result == 100);
}