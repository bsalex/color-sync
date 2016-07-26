module ColorSync exposing (..)

import Html exposing (Html, div)
import Html.Attributes exposing (class, style)

type alias Model = String

initialModel : Model
initialModel =
  "#FFF"

type Msg =
  ChangeColor String | Reset


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    ChangeColor newColor ->
      ( newColor, Cmd.none )

    Reset ->
      ( "#FFF", Cmd.none )


view : Model -> Html Msg
view model =
  div [class "color-sync", style [("background-color", model)]]
    []
