using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        ILogger<CustomerController> logger;
        CustomerService customerService;

        public CustomerController(ILogger<CustomerController> logger, CustomerService customerService)
        {
            this.logger = logger;
            this.customerService = customerService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Customer>>> Entity()
        {
            ActionRes<Customer> result = new ActionRes<Customer>()
            {
               item = new Customer()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Customer>>>> Select(ActionReq<CustomerSelectReq> req)
        {
            ActionRes<List<Customer>> result = new ActionRes<List<Customer>>();

            result.item = await customerService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Customer>>> Insert(ActionReq<Customer> req)
        {
            ActionRes<Customer> result = new ActionRes<Customer>();

            result.item = await customerService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Customer>>> Update(ActionReq<Customer> req)
        {
            ActionRes<Customer> result = new ActionRes<Customer>();

            result.item = await customerService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Customer>>> Save(ActionReq<Customer> req)
        {
            ActionRes<Customer> result = new ActionRes<Customer>();

            if(req.item.id > 0){
                result.item = await customerService.Update(req.item);
            }else{
                result.item = await customerService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<CustomerDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await customerService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("LoyaltySummary")]
        public async Task<ActionResult<ActionRes<CustomerLoyaltySummaryRes>>> LoyaltySummary(ActionReq<CustomerLoyaltySummaryReq> req)
        {
            ActionRes<CustomerLoyaltySummaryRes> result = new ActionRes<CustomerLoyaltySummaryRes>();
            result.item = await customerService.GetLoyaltySummary(req.item);
            return Ok(result);
        }
    }
}
