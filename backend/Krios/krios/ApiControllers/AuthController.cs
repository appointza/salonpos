using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AuthService authService;
        private readonly UserLoginService userLoginService;

        public AuthController(AuthService authService, UserLoginService userLoginService)
        {
            this.authService = authService;
            this.userLoginService = userLoginService;
        }

        [HttpPost("Identify")]
        public async Task<ActionResult<ActionRes<AuthIdentifyRes>>> Identify(ActionReq<AuthIdentifyReq> req)
        {
            var result = new ActionRes<AuthIdentifyRes> { item = await authService.Identify(req.item) };
            return Ok(result);
        }

        [HttpPost("SendOtp")]
        public async Task<ActionResult<ActionRes<AuthSendOtpRes>>> SendOtp(ActionReq<AuthSendOtpReq> req)
        {
            var result = new ActionRes<AuthSendOtpRes> { item = await authService.SendOtp(req.item) };
            return Ok(result);
        }

        [HttpPost("SetupCustomerPassword")]
        public async Task<ActionResult<ActionRes<UserLoginRes>>> SetupCustomerPassword(ActionReq<AuthSetupCustomerPasswordReq> req)
        {
            var result = new ActionRes<UserLoginRes> { item = await authService.SetupCustomerPassword(req.item) };
            return Ok(result);
        }

        [HttpPost("LoginCustomer")]
        public async Task<ActionResult<ActionRes<UserLoginRes>>> LoginCustomer(ActionReq<AuthCustomerLoginReq> req)
        {
            var result = new ActionRes<UserLoginRes> { item = await authService.LoginCustomer(req.item) };
            return Ok(result);
        }

        [HttpPost("LoginOrganization")]
        public async Task<ActionResult<ActionRes<UserLoginRes>>> LoginOrganization(ActionReq<UserLoginReq> req)
        {
            var result = new ActionRes<UserLoginRes> { item = await userLoginService.Login(req.item) };
            return Ok(result);
        }
    }
}
