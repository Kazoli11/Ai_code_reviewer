import java.util.InputMismatchException;
import java.util.Scanner;

public class jaggedSum {
    public static int jagged(int[][] arr) {
        int sum = 0;
        for (int i = 0; i < arr.length; i++) {
            for (int j = 0; j < arr[i].length; j++) {
                sum += arr[i][j];
            }
        }
        return sum;
    }

    public static void main(String[] args) {
        try (Scanner sc = new Scanner(System.in)) {
            int row;
            while (true) {
                try {
                    System.out.print("Enter the number of rows: ");
                    row = sc.nextInt();
                    if (row <= 0) {
                        System.out.println("Number of rows must be positive.");
                    } else {
                        break;
                    }
                } catch (InputMismatchException e) {
                    System.out.println("Invalid input. Please enter a valid integer.");
                    sc.next();
                }
            }

            int[][] a = new int[row][];
            for (int i = 0; i < row; i++) {
                int col;
                while (true) {
                    try {
                        System.out.print("Enter the number of columns for row "+ (i + 1) +": ");
                        col = sc.nextInt();
                        if (col <= 0) {
                            System.out.println("Number of columns must be positive.");
                        } else {
                            break;
                        }
                    } catch (InputMismatchException e) {
                        System.out.println("Invalid input. Please enter a valid integer.");
                        sc.next();
                    }
                }
                a[i] = new int[col];
                for (int j = 0; j < col; j++) {
                    while (true) {
                        try {
                            System.out.print("Enter element "+ (j + 1) +" for row "+ (i + 1) +": ");
                            a[i][j] = sc.nextInt();
                            break;
                        } catch (InputMismatchException e) {
                            System.out.println("Invalid input. Please enter a valid integer.");
                            sc.next();
                        }
                    }
                }
            }

            System.out.println("You entered the following matrix:");
            for (int i = 0; i < row; i++) {
                for (int j = 0; j < a[i].length; j++) {
                    System.out.print(a[i][j] + " ");
                }
                System.out.println();
            }
            int sum = jagged(a);
            System.out.println("Jagged Sum:" + sum);
        }
    }
}