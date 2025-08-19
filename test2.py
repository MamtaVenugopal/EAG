import asyncio
import time
def say_hello():
    time.sleep(2)
    print("Hello World!")

def say_good_bye():
    time.sleep(1)
    print("GoodBye World!")
async def main():
    start=time.time()
    say_hello()
    say_good_bye()
    total = time.time() - start
    print(f"Total time for this version: {total:.2f} seconds")



asyncio.run(main())