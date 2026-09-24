using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpenseController : ControllerBase
    {
        ILogger<ExpenseController> logger;
        ExpenseService expenseService;

        public ExpenseController(ILogger<ExpenseController> logger, ExpenseService expenseService)
        {
            this.logger = logger;
            this.expenseService = expenseService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Expense>>> Entity()
        {
            ActionRes<Expense> result = new ActionRes<Expense>()
            {
               item = new Expense()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Expense>>>> Select(ActionReq<ExpenseSelectReq> req)
        {
            ActionRes<List<Expense>> result = new ActionRes<List<Expense>>();

            result.item = await expenseService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Expense>>> Insert(ActionReq<Expense> req)
        {
            ActionRes<Expense> result = new ActionRes<Expense>();

            result.item = await expenseService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Expense>>> Update(ActionReq<Expense> req)
        {
            ActionRes<Expense> result = new ActionRes<Expense>();

            result.item = await expenseService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Expense>>> Save(ActionReq<Expense> req)
        {
            ActionRes<Expense> result = new ActionRes<Expense>();

            if(req.item.id > 0){
                result.item = await expenseService.Update(req.item);
            }else{
                result.item = await expenseService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ExpenseDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await expenseService.Delete(req.item);

            return Ok(result);
        }
    }
}
