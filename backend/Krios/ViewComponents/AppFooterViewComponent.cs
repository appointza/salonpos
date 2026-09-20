using Microsoft.AspNetCore.Mvc;
using Krios.Models;
using Krios.Services;
using Krios.Utils;
using Krios.ViewModels;

namespace Krios.ViewComponents
{
    public class AppFooterViewComponent : ViewComponent
    {

        RequestState requeststate;
        public AppFooterViewComponent( RequestState requeststate)
        {
            this.requeststate = requeststate;
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppFooterViewModel data = new AppFooterViewModel();
            
            return View(data);
        }
    }
}
