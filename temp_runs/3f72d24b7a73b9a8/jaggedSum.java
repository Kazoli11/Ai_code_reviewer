import java.util.Scanner;
public class jaggedSum {
    public static int jagged(int[][] arr)
    {
        int sum=0;
        for(int i=0;i<arr.length;i++)
        {
            for(int j=0;j<arr[i].length;j++)
            {
                sum+=arr[i][j];
            }
        }
        return sum;
    }
    public static void main(String[] args)
    {
        Scanner sc=new Scanner(System.in);
        int row=sc.nextInt();
        int[][] a=new int[row][];
        for(int i=0;i<row;i++)
        {
            int col=sc.nextInt();
            a[i]=new int[col];
            for(int j=0;j<col;j++)
            {
                a[i][j]=sc.nextInt();
            }
        }
        sc.close();
        for(int i=0;i<row;i++)
        {
            for(int j=0;j<a[i].length;j++)
            {
                System.out.print(a[i][j]+" ");
            }
            System.out.println();
        }
        int sum=jagged(a);
        System.out.println("Jagged Sum:"+sum);
    }
}
