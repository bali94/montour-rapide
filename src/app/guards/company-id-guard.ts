 import { CanActivateFn, Router, ActivatedRouteSnapshot } from         
    '@angular/router';                                                    
 import { inject } from '@angular/core';                               
                                                                       
 export const companyIdGuard: CanActivateFn = (route:                  
 ActivatedRouteSnapshot, state) => {                                   
   const router = inject(Router);                                      
   const companyId = route.queryParams['companyId'];                   
                                                                       
   if (companyId) {                                                    
     return true;                                                      
    } else {                                                            
      router.navigate(['/login']);                                   
      return false;                                                     
    }                                                                   
  };  