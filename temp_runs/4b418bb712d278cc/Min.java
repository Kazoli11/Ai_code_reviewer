public class Min
{
    public static int findMin(int[] a)
        {
            int i=0;
            int min=a[0];
            while(i<a.length)
            {
                if(min>a[i])
                {
                    min=a[i];
                }
                i++;
            }
            return min;
        }
        public static void main(String[] args) {
            int[] arr={9,5,12,1,15};
            int min=findMin(arr);
            System.out.println("Min:"+min);
        
    }
}