using Microsoft.AspNetCore.Mvc;
using Krios.Models;
using Krios.Services;
using Krios.Utils;
using Krios.ViewModels;

namespace Krios.ViewComponents
{
    public class AppFooterMobileViewComponent : ViewComponent
    {
        RequestState requeststate;
        public AppFooterMobileViewComponent(RequestState requeststate)
        {
            this.requeststate = requeststate;
           
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppFooterMobileViewModel data = new AppFooterMobileViewModel();
            

            return View(data);
        }
    }
}
