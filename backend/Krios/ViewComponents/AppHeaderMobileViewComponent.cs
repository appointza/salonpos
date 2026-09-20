using Microsoft.AspNetCore.Mvc;
using Krios.Models;
using Krios.Services;
using Krios.Utils;
using Krios.ViewModels;

namespace Krios.ViewComponents
{
    public class AppHeaderMobileViewComponent : ViewComponent
    {
        private RequestState _requestState;
        
        public AppHeaderMobileViewComponent(RequestState requestState)
        {
            _requestState = requestState;
            
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppHeaderMobileViewModel data = new AppHeaderMobileViewModel();
            
            return View(data);
        }
    }
}
