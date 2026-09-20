using Microsoft.AspNetCore.Mvc;
using Krios.Services;
using Krios.Utils;
using Krios.ViewModels;
using Krios.Models;
using Amazon.Util.Internal.PlatformServices;


namespace Krios.ViewComponents
{
    public class AppHeaderViewComponent : ViewComponent
    {
        private RequestState _requestState;
        
        public AppHeaderViewComponent(RequestState requestState)
        {
            _requestState = requestState;
           
        }
        public async Task<IViewComponentResult> InvokeAsync()
        {
            AppHeaderViewModel data = new AppHeaderViewModel();
           
            return View(data);
        }
    }
}
