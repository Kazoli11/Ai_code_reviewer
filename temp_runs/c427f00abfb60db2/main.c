#include <stdio.h>

struct dir 
{ 
 char dname[5]; 
 int no; 
 char fn[5][10]; 
}d[5]; 
 
void get(int n) 
{ 
 int i,j; 
 for(i=0;i<n;i++){ 
  printf("Enter the %d directory name : ",i+1); 
  scanf("%s",d[i].dname); 
  printf("Enter the no. of files in that directory : "); 
  scanf("%d",&d[i].no); 
  for(j=0;j<d[i].no;j++){ 
   printf("Enter %d file name : ",j+1); 
   scanf("%s",d[i].fn[j]); 
  } 
 } 
} 
 
void display(int n) 
{ 
 int i,j; 
 printf("\n\n"); 
 for(i=0;i<n;i++){ 
  printf("%s\n",d[i].dname); 
  for(j=0;j<d[i].no;j++){ 
   printf("    >%s\n",d[i].fn[j]); 
  } 
 } 
} 
 
void main() 
{ 
 int n; 
 clrscr(); 
 printf("Enter the no. of directories : "); 
 scanf("%d",&n); 
 get(n); 
 display(n); 
 getch(); 
}