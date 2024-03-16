// Define the main function which takes three public inputs
fn main(x: pub Field, y: pub Field, output: pub Field) {
    // Perform the multiplication
    let result = x * y;

    // Assert that the computed result matches the provided output
    assert(result == output);
}
